import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  rm,
  rename,
  readFile,
  writeFile,
  symlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Runtime } from "../lib/runtime.js";
import { scanModels, modelParts } from "../lib/models.js";
import { exportConfig, importConfig } from "../lib/config-transfer.js";
import { DoryAdapter } from "../lib/adapter.js";
import { gguf } from "./model-fixture.js";
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "dory-import-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtime = new Runtime({ dataDir: join(root, "state") });
  await runtime.init();
  t.after(() => runtime.dispose());
  return { root, runtime };
}
test("recursive scanner groups shards, detects gaps, skips other architectures and terminates link cycles", async (t) => {
  const { root } = await fixture(t),
    models = join(root, "models");
  await mkdir(join(models, "nested"), { recursive: true });
  await gguf(join(models, "single.gguf"));
  await gguf(join(models, "other.gguf"), { architecture: "qwen35" });
  await gguf(join(models, "nested", "split-00001-of-00003.gguf"), { count: 3 });
  await gguf(join(models, "nested", "split-00003-of-00003.gguf"), {
    index: 2,
    count: 3,
  });
  await symlink(models, join(models, "nested", "loop"));
  const result = await scanModels(models);
  assert.equal(result.models.length, 2);
  assert.equal(result.models.filter((m) => m.complete).length, 1);
  assert.deepEqual(result.models.find((m) => !m.complete).missing, [2]);
  assert.match(result.warnings.join(" "), /qwen35/);
  await assert.rejects(
    modelParts(join(models, "nested", "split-00003-of-00003.gguf")),
    /Missing/,
  );
  await gguf(join(models, "nested", "split-00002-of-00003.gguf"), {
    index: 1,
    count: 3,
  });
  assert.deepEqual(
    (await modelParts(join(models, "nested", "split-00003-of-00003.gguf"))).map(
      (f) => f.index,
    ),
    [1, 2, 3],
  );
  await assert.rejects(scanModels("/"), /entire filesystem/);
});
test("portable config locates moved files by size and MD5, preserves names/settings and excludes commands", async (t) => {
  const { root, runtime } = await fixture(t),
    source = join(root, "source"),
    moved = join(root, "moved");
  await mkdir(source);
  await mkdir(moved);
  const first = join(source, "dory-00001-of-00002.gguf"),
    second = join(source, "dory-00002-of-00002.gguf");
  await gguf(first, { count: 2 });
  await gguf(second, { count: 2, index: 1 });
  const p = await runtime.addModel(second);
  Object.assign(p, {
    name: "My Dory four",
    loops: 4,
    kvK: "q8_0",
    kvV: "q4_0",
    context: 65536,
    executable: "/private/custom",
    environment: { TOKEN: "secret" },
  });
  await runtime.save(p);
  const manifest = await exportConfig(runtime, p.id);
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.settings.loops, 4);
  assert.equal(manifest.settings.environment, undefined);
  assert.equal(manifest.settings.executable, undefined);
  await rename(first, join(moved, "renamed-a.bin"));
  await rename(second, join(moved, "renamed-b.bin"));
  await writeFile(
    join(moved, "same-size-wrong"),
    Buffer.alloc(manifest.files[0].size),
  );
  Object.assign(manifest.settings, {
    executable: "/malicious/command",
    environment: { TOKEN: "imported" },
    options: { "--host": "evil" },
  });
  const result = await importConfig(runtime, manifest, moved),
    imported = runtime.find(result.ids[0]);
  assert.equal(imported.name, "My Dory four");
  assert.equal(imported.loops, 4);
  assert.equal(imported.context, 65536);
  assert.equal(imported.kvV, "q4_0");
  assert.equal(imported.executable, "");
  assert.deepEqual(imported.environment, {});
  assert.deepEqual(imported.options, {});
  assert.notEqual(imported.id, p.id);
  assert.notEqual(imported.port, p.port);
  const adapter = new DoryAdapter({}, runtime);
  assert.equal(
    (await adapter.listModels()).find((m) => m.id === imported.id).name,
    "My Dory four",
  );
  await runtime.save({ ...imported, name: "Renamed Dory" });
  assert.equal(runtime.find(imported.id).modelPath, imported.modelPath);
  const reload = new Runtime({ dataDir: runtime.root });
  await reload.init();
  assert.equal(reload.find(imported.id).name, "Renamed Dory");
  await reload.dispose();
  const wrong = structuredClone(manifest);
  wrong.files[0].md5 = "0".repeat(32);
  await assert.rejects(
    importConfig(runtime, wrong, moved),
    /No exact size and MD5/,
  );
  assert.equal(
    (await readFile(join(moved, "renamed-a.bin"))).length,
    manifest.files[0].size,
  );
});
