import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KvCache } from "../lib/kv-cache.js";
import { freshProfile } from "../lib/profiles.js";
test("native snapshots survive restart, isolate loop/KV settings and evict least recently used first", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dory-kv-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const model = join(root, "weights");
  await writeFile(model, "weights");
  const exe = join(root, "server");
  await writeFile(exe, "server");
  const p = { ...freshProfile(), modelPath: model, executable: exe };
  const calls = [];
  let state;
  const request = async (url, options) => {
    const { filename } = JSON.parse(options.body);
    calls.push({ url, filename });
    if (url.includes("save"))
      await writeFile(join(state.cacheDirectory, filename), Buffer.alloc(10));
    return Response.json({ n_saved: 16, n_restored: 16 });
  };
  let cache = new KvCache(join(root, "cache"), { budget: 20, request }),
    identity = await cache.identity(p);
  state = {
    url: "http://fixture",
    cacheIdentity: identity,
    cacheDirectory: await cache.directory(identity),
  };
  await cache.save(state, "one");
  const first = (await cache.catalog(state.cacheDirectory))[0];
  await new Promise((r) => setTimeout(r, 5));
  await cache.save(state, "two");
  cache = new KvCache(join(root, "cache"), { budget: 20, request });
  delete state.cacheSession;
  await cache.restore(state, "one");
  assert.match(calls.at(-1).url, /restore/);
  assert.equal(calls.at(-1).filename, first.file);
  await new Promise((r) => setTimeout(r, 5));
  await cache.save(state, "three");
  const entries = await cache.catalog(state.cacheDirectory);
  assert.equal(entries.length, 2);
  assert.ok(entries.some((e) => e.file === first.file));
  assert.equal(
    (await readdir(state.cacheDirectory)).filter((f) => f.endsWith(".kv"))
      .length,
    2,
  );
  assert.notEqual(
    (await cache.identity({ ...p, loops: 4 })).configuration,
    identity.configuration,
  );
  assert.equal(
    (await cache.identity({ ...p, loops: 4 })).model,
    identity.model,
  );
  assert.notEqual(
    (await cache.identity({ ...p, kvK: "q4_0" })).configuration,
    identity.configuration,
  );
  const old = await readFile(join(state.cacheDirectory, "index.json"));
  cache.request = async () =>
    Response.json({ error: { message: "native failure" } }, { status: 500 });
  await assert.rejects(cache.save(state, "one"), /native failure/);
  assert.deepEqual(
    await readFile(join(state.cacheDirectory, "index.json")),
    old,
  );
});
