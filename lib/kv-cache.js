import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
  readdir,
  stat,
  statfs,
  chmod,
} from "node:fs/promises";
import { join } from "node:path";
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const filename = /^checkpoint-[a-f0-9-]+\.kv$/;
async function atomic(path, value) {
  const temp = path + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(value), { mode: 0o600, flush: true });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

/** llama.cpp owns serialization and token-prefix validation. Catalogs contain no prompt text. */
export class KvCache {
  constructor(root, { budget = 16 * 1024 ** 3, request = fetch } = {}) {
    this.root = root;
    this.budget = budget;
    this.request = request;
    this.tail = Promise.resolve();
  }
  async identity(p) {
    const files = [];
    for (const path of [
      p.executable,
      ...(p.modelFiles?.length ? p.modelFiles : [p.modelPath]),
    ]) {
      const info = await stat(path);
      files.push({
        path,
        device: info.dev,
        inode: info.ino,
        size: info.size,
        mtime: info.mtimeMs,
        ctime: info.ctimeMs,
      });
    }
    const model = hash(
      files
        .slice(1)
        .map(({ device, inode, size }) => ({ device, inode, size })),
    );
    return {
      model,
      configuration: hash({
        files,
        context: p.context,
        loops: p.loops,
        kvMode: p.kvMode,
        kvK: p.kvK,
        kvV: p.kvV,
        options: p.options,
        gpuLayers: p.gpuLayers,
        autoFit: p.autoFit,
      }),
    };
  }
  async directory(identity) {
    const path = join(this.root, identity.model, identity.configuration);
    await mkdir(path, { recursive: true, mode: 0o700 });
    return path;
  }
  async catalog(directory) {
    try {
      const value = JSON.parse(
        await readFile(join(directory, "index.json"), "utf8"),
      );
      if (value.version !== 1 || !Array.isArray(value.entries))
        throw Error("Invalid checkpoint catalog.");
      return value.entries.filter(
        (e) =>
          filename.test(e.file) &&
          /^[a-f0-9]{64}$/.test(e.session) &&
          Number.isSafeInteger(e.bytes) &&
          e.bytes > 0 &&
          Number.isFinite(e.used),
      );
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  async slot(state, action, file) {
    const response = await this.request(
      state.url + "/slots/0?action=" + action,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(state.apiKey ? { Authorization: "Bearer " + state.apiKey } : {}),
        },
        body: JSON.stringify({ filename: file }),
        signal: AbortSignal.timeout(900000),
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error?.message || "Checkpoint " + action + " failed.");
    return result;
  }
  serialize(operation) {
    const job = this.tail.catch(() => {}).then(operation);
    this.tail = job;
    return job;
  }
  restore(state, sessionId) {
    return this.serialize(() => this.restoreNative(state, sessionId));
  }
  save(state, sessionId) {
    return this.serialize(() => this.saveNative(state, sessionId));
  }
  async restoreNative(state, sessionId) {
    if (!sessionId || state.cacheSession === String(sessionId)) return;
    const directory = state.cacheDirectory,
      entries = await this.catalog(directory);
    const entry = entries.find((e) => e.session === hash(String(sessionId)));
    if (!entry) return;
    const info = await stat(join(directory, entry.file));
    if (info.size !== entry.bytes || !info.isFile())
      throw Error("Incomplete saved checkpoint; starting without it.");
    const result = await this.slot(state, "restore", entry.file);
    entry.used = Date.now();
    await atomic(join(directory, "index.json"), { version: 1, entries });
    state.cacheSession = String(sessionId);
    state.cacheStatus = {
      phase: "restored",
      tokens: result.n_restored,
      bytes: info.size,
    };
  }
  async saveNative(state, sessionId) {
    if (!sessionId) return;
    const directory = state.cacheDirectory,
      entries = await this.catalog(directory);
    const session = hash(String(sessionId)),
      old = entries.find((e) => e.session === session);
    const space = await statfs(directory);
    if (
      Number(space.bavail) * Number(space.bsize) <
      Math.max(512 * 1024 ** 2, (old?.bytes || 0) * 1.1)
    )
      throw Error("Insufficient SSD space for a safe checkpoint replacement.");
    const file = "checkpoint-" + randomUUID() + ".kv",
      path = join(directory, file);
    try {
      const result = await this.slot(state, "save", file),
        info = await stat(path);
      if (!info.isFile() || !info.size || info.size > this.budget)
        throw Error(
          "Checkpoint is empty or exceeds the 16 GiB per-model limit.",
        );
      await chmod(path, 0o600);
      const next = [
        { session, file, bytes: info.size, used: Date.now() },
        ...entries.filter((e) => e.session !== session),
      ];
      await atomic(join(directory, "index.json"), {
        version: 1,
        entries: next,
      });
      if (old) await rm(join(directory, old.file), { force: true });
      await this.evict(state.cacheIdentity.model);
      state.cacheSession = String(sessionId);
      state.cacheStatus = {
        phase: "saved",
        tokens: result.n_saved,
        bytes: info.size,
      };
    } catch (error) {
      if (!(await this.catalog(directory)).some((e) => e.file === file))
        await rm(path, { force: true });
      throw error;
    }
  }
  async evict(model) {
    const root = join(this.root, model),
      rows = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
      const directory = join(root, entry.name),
        entries = await this.catalog(directory);
      for (const item of entries) rows.push({ directory, item });
    }
    rows.sort((a, b) => a.item.used - b.item.used);
    let bytes = rows.reduce((sum, row) => sum + row.item.bytes, 0);
    for (const { directory, item } of rows) {
      if (bytes <= this.budget) break;
      const entries = (await this.catalog(directory)).filter(
        (e) => e.file !== item.file,
      );
      await atomic(join(directory, "index.json"), { version: 1, entries });
      await rm(join(directory, item.file), { force: true });
      bytes -= item.bytes;
    }
  }
}
