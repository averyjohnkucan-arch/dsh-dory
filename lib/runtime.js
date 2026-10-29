import { recommendedFor, disposeRecommended } from "./recommended-models.mjs";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  access,
  readdir,
  stat,
  rm,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { freshProfile, validateProfile, launchArgs } from "./profiles.js";
import { ready, terminate, gpuInfo, run } from "./process.js";
import { Jobs } from "./jobs.js";
import { scanModels, modelParts } from "./models.js";
import { exportConfig, importConfig } from "./config-transfer.js";
import { installEngine } from "./engine-install.js";
import { KvCache } from "./kv-cache.js";
import { benchmark } from "./benchmark.js";

const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

export class Runtime {
  constructor(config = {}, onChange = () => {}) {
    this.root = resolve(
      config.dataDir ||
        join(process.env.DSH_HOME || join(homedir(), ".dsh"), "dsh-dory"),
    );
    this.onChange = () => {
      if (!this.disposed) onChange();
    };
    this.profiles = [];
    this.running = new Map();
    this.starting = new Map();
    this.queue = Promise.resolve();
    this.scheduler = null;
    this.disposed = false;
    this.shutdown = new AbortController();
    this.jobs = new Jobs(this.onChange);
    this.cache = new KvCache(join(this.root, "cache"));
    this.engine = "";
  }
  async init() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    try {
      const data = JSON.parse(
        await readFile(join(this.root, "profiles.json"), "utf8"),
      );
      if (data.version !== 1 || !Array.isArray(data.profiles))
        throw Error("Unsupported Dory profile file.");
      this.profiles = data.profiles.map(validateProfile);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.persist();
    }
  }
  persist() {
    const value =
      JSON.stringify({ version: 1, profiles: this.profiles }, null, 2) + "\n";
    const job = this.queue
      .catch(() => {})
      .then(async () => {
        const temp = join(this.root, `profiles.${randomUUID()}.tmp`);
        try {
          await writeFile(temp, value, { mode: 0o600, flush: true });
          await rename(temp, join(this.root, "profiles.json"));
        } finally {
          await rm(temp, { force: true });
        }
      });
    this.queue = job;
    return job;
  }
  find(id) {
    const p = this.profiles.find((p) => p.id === id);
    if (!p) throw Error("Dory profile not found.");
    return p;
  }
  list() {
    return {
      version,
      sharedScheduler: !!this.scheduler,
      profiles: this.profiles.map((p) => ({
        ...p,
        status: this.starting.has(p.id)
          ? "loading"
          : this.running.get(p.id)?.ready
            ? "running"
            : "stopped",
        activeRequests: this.running.get(p.id)?.active || 0,
        log: this.running.get(p.id)?.log || "",
        cacheStatus: this.running.get(p.id)?.cacheStatus,
      })),
      dataDir: this.root,
      jobs: this.jobs.list(),
      runtimeReady: !!this.engine,
    };
  }
  async save(input) {
    const p = validateProfile(input);
    if (this.starting.has(p.id) || this.running.get(p.id)?.active)
      throw Error(
        "Wait for the active load/answer before editing this profile.",
      );
    if (this.profiles.some((x) => x.id !== p.id && x.port === p.port))
      throw Error("Another Dory profile uses this port.");
    await this.unload(p.id);
    const previous = this.profiles;
    this.profiles = [...previous.filter((x) => x.id !== p.id), p];
    try {
      await this.persist();
    } catch (error) {
      this.profiles = previous;
      throw error;
    }
    this.onChange();
    return p;
  }
  driver(p) {
    return {
      key: "dory:" + p.id,
      name: p.name,
      gpu: p.gpu,
      priority: "interactive",
      fingerprint: JSON.stringify(p),
      load: (signal) => this.start(p, { signal }),
      unload: () => this.stop(p.id),
      busy: () => !!this.running.get(p.id)?.active || this.starting.has(p.id),
    };
  }
  async acquire(p, signal) {
    signal = signal
      ? AbortSignal.any([signal, this.shutdown.signal])
      : this.shutdown.signal;
    if (this.scheduler) return this.scheduler.acquire(this.driver(p), signal);
    const state = await this.start(p, { signal });
    return { state, signal, release: () => {} };
  }
  async ensureEngine(signal, report) {
    if (!this.installing) {
      this.installing = installEngine(this.root, signal, report)
        .then((path) => (this.engine = path))
        .catch((error) => {
          this.engine = "";
          throw error;
        })
        .finally(() => {
          this.installing = null;
        });
    }
    return this.installing;
  }
  async start(input, { signal } = {}) {
    const p = validateProfile(input);
    if (this.disposed) throw Error("Dory plugin is unloaded.");
    if (!p.enabled) throw Error("This profile is disabled.");
    signal = signal
      ? AbortSignal.any([signal, this.shutdown.signal])
      : this.shutdown.signal;
    signal.throwIfAborted();
    if (this.starting.has(p.id)) return this.starting.get(p.id);
    const job = this.startLocal(p, signal);
    this.starting.set(p.id, job);
    try {
      return await job;
    } finally {
      this.starting.delete(p.id);
    }
  }
  async startLocal(p, signal) {
    const prior = this.running.get(p.id);
    if (prior?.ready) return prior;
    for (const [id, state] of this.running)
      if (state.profile.gpu === p.gpu) {
        if (state.active)
          throw Error(
            "Another Dory profile is answering; wait before switching loops.",
          );
        await this.stop(id);
      }
    await access(p.modelPath);
    if (!p.executable) p.executable = await this.ensureEngine(signal);
    await access(p.executable);
    const url = `http://127.0.0.1:${p.port}`;
    try {
      await fetch(url + "/v1/models", { signal: AbortSignal.timeout(1500) });
      throw Error(
        `Port ${p.port} is occupied; existing server left untouched.`,
      );
    } catch (error) {
      if (error.name !== "TypeError") throw error;
    }
    // Cooperating providers use the shared scheduler. Foreign GPU processes are left alone.
    // Memory placement is decided by the native fitter, never by a weights-size guess.
    if (p.autoFit || p.gpuLayers > 0) {
      const result = await run(
        "nvidia-smi",
        ["--query-compute-apps=pid", "--format=csv,noheader,nounits"],
        { signal },
      );
      if (result.stdout.trim())
        throw Error("Another GPU process is active; no Dory process launched.");
    }
    let cacheIdentity, cacheDirectory;
    const args = launchArgs(p);
    const apiKey = randomBytes(32).toString("hex");
    args.push("--api-key", apiKey, "--cors-origins", "localhost");
    if (p.kvCache) {
      cacheIdentity = await this.cache.identity(p);
      cacheDirectory = await this.cache.directory(cacheIdentity);
      args.push("--slot-save-path", cacheDirectory);
    }
    signal.throwIfAborted();
    const child = spawn(p.executable, args, {
      cwd: dirname(p.executable),
      env: {
        ...process.env,
        ...p.environment,
        CUDA_VISIBLE_DEVICES: String(p.gpu),
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    const state = {
      child,
      profile: p,
      url,
      ready: false,
      active: 0,
      log: "",
      startupLog: "",
      gate: Promise.resolve(),
      cacheIdentity,
      cacheDirectory,
      apiKey,
    };
    this.running.set(p.id, state);
    const log = (b) => {
      // Keep the diagnostic before a long CLI manual as well as the latest runtime output.
      if (!state.ready)
        state.startupLog = (state.startupLog + b).slice(0, 16000);
      state.log = (state.log + b).slice(-30000);
    };
    child.stdout.on("data", log);
    child.stderr.on("data", log);
    child.on("error", (error) => {
      state.launchError = error;
      log(String(error));
    });
    child.on("exit", () => {
      state.ready = false;
      this.onChange();
    });
    try {
      await ready(url, child, {
        signal,
        log: () => state.startupLog + "\n" + state.log,
        headers: { Authorization: "Bearer " + apiKey },
      });
      if (state.launchError) throw state.launchError;
      const listing = await (
        await fetch(url + "/v1/models", {
          signal: AbortSignal.timeout(3000),
          headers: { Authorization: "Bearer " + apiKey },
        })
      ).json();
      if (!listing.data?.some((model) => model.id === p.id))
        throw Error(
          "Engine model identity does not match the requested profile.",
        );
      state.ready = true;
      this.onChange();
      return state;
    } catch (error) {
      await terminate(child);
      this.running.delete(p.id);
      throw error;
    }
  }
  async stop(id) {
    const state = this.running.get(id);
    if (!state) return;
    if (state.active)
      throw Error("Dory is answering; cancel the answer before unloading.");
    await terminate(state.child);
    this.running.delete(id);
    this.onChange();
  }
  async unload(id) {
    if (this.running.get(id)?.active)
      throw Error("Dory is answering; wait or cancel first.");
    if (this.scheduler) await this.scheduler.unload("dory:" + id);
    await this.stop(id);
  }
  async browse(path) {
    const directory = resolve(path || homedir()),
      entries = [];
    for (const row of await readdir(directory, { withFileTypes: true })) {
      try {
        const path = join(directory, row.name),
          info = row.isSymbolicLink() ? await stat(path) : null;
        const folder = row.isDirectory() || info?.isDirectory();
        if (
          folder ||
          ((row.isFile() || info?.isFile()) &&
            (/\.(gguf|json)$/i.test(row.name) ||
              /llama-server(?:\.exe)?$/.test(row.name)))
        )
          entries.push({ name: row.name, path, directory: !!folder });
      } catch (error) {
        if (!["ENOENT", "EACCES", "ELOOP"].includes(error.code)) throw error;
      }
    }
    entries.sort(
      (a, b) =>
        Number(b.directory) - Number(a.directory) ||
        a.name.localeCompare(b.name),
    );
    return {
      path: directory,
      parent: dirname(directory),
      entries: entries.slice(0, 1000),
      truncated: entries.length > 1000,
    };
  }
  async addModel(path, signal) {
    const parts = await modelParts(path, signal),
      p = freshProfile();
    p.name = parts[0].group;
    p.modelPath = parts[0].path;
    p.modelFiles = parts.map((f) => f.path);
    p.nativeContext = parts[0].metadata["dory.context_length"] || 262144;
    p.context = Math.min(p.nativeContext, 262144);
    while (this.profiles.some((other) => other.port === p.port)) p.port++;
    return this.save(p);
  }
  async purgeCache() {
    if (
      this.starting.size ||
      this.jobs.busy() ||
      [...this.running.values()].some((s) => s.active)
    )
      throw Error("Wait for active work before purging cache.");
    for (const id of this.running.keys()) await this.unload(id);
    await rm(this.cache.root, { recursive: true, force: true });
    return { purged: true };
  }
  async action(action, payload = {}) {
    if (
      ["recommended", "recommendedDownload", "recommendedCancel"].includes(
        action,
      )
    )
      return recommendedFor(this, import.meta.url, this.root).action(
        action,
        payload,
      );
    switch (action) {
      case "list":
        return this.list();
      case "new": {
        const p = freshProfile();
        while (this.profiles.some((x) => x.port === p.port)) p.port++;
        return p;
      }
      case "save":
        return this.save(payload);
      case "duplicate": {
        const p = structuredClone(this.find(payload.id));
        p.id = randomUUID();
        p.name += " · copy";
        p.port = Math.max(8249, ...this.profiles.map((p) => p.port)) + 1;
        return p;
      }
      case "remove":
        await this.unload(payload.id);
        this.profiles = this.profiles.filter((p) => p.id !== payload.id);
        await this.persist();
        this.onChange();
        return { removed: true };
      case "start":
        return this.jobs.add("Load model", async (signal) => {
          const lease = await this.acquire(this.find(payload.id), signal);
          lease.release();
          return { ready: true };
        });
      case "stop":
        await this.unload(payload.id);
        return { stopped: true };
      case "browse":
        return this.browse(payload.path);
      case "gpu":
        return gpuInfo(payload.gpu || 0);
      case "scan":
        return this.jobs.add(
          "Scan model folders",
          (signal, report) => scanModels(payload.path, { signal, report }),
          { serial: false },
        );
      case "importModel":
        return this.jobs.add("Import model", (signal) =>
          this.addModel(payload.path, signal),
        );
      case "exportConfig":
        return this.jobs.add("Export config", (signal, report) =>
          exportConfig(this, payload.id, signal, report),
        );
      case "importConfig":
        return this.jobs.add("Import config", async (signal, report) => {
          const info = await stat(payload.configPath);
          if (info.size > 2 * 1024 ** 2) throw Error("Config exceeds 2 MiB.");
          return importConfig(
            this,
            JSON.parse(await readFile(payload.configPath, "utf8")),
            payload.root,
            signal,
            report,
          );
        });
      case "benchmark":
        return this.jobs.add("Benchmark settings", (signal, report) =>
          benchmark(this, payload.id, signal, report),
        );
      case "installEngine":
        return this.jobs.add("Install Dory runtime", (signal, report) =>
          this.ensureEngine(signal, report),
        );
      case "cancel":
        this.jobs.cancel(payload.id);
        return { cancelled: true };
      case "purgeCache":
        return this.purgeCache();
      default:
        throw Error("Unknown Dory action.");
    }
  }
  async dispose() {
    this.disposed = true;
    this.shutdown.abort();
    await this.jobs.close();
    await disposeRecommended(this);
    await Promise.allSettled([...this.starting.values()]);
    for (const [id, state] of this.running) {
      await terminate(state.child);
      this.running.delete(id);
    }
    await this.cache.tail.catch(() => {});
    await this.queue;
  }
}
