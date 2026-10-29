import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, chmod, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { Runtime } from "../lib/runtime.js";
import { freshProfile } from "../lib/profiles.js";
async function port() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "dsh-dory-"));
  const script = join(dir, "llama-server");
  await writeFile(
    script,
    `#!${process.execPath}\nimport http from 'node:http';const a=process.argv;const v=k=>a[a.indexOf(k)+1];http.createServer((q,s)=>{s.setHeader('Content-Type','application/json');s.end(JSON.stringify({data:[{id:v('--alias')}],override:v('--override-kv')}));}).listen(Number(v('--port')),'127.0.0.1');`,
  );
  await chmod(script, 0o700);
  const runtime = new Runtime({ dataDir: join(dir, "state") });
  await runtime.init();
  t.after(async () => {
    await runtime.dispose();
    await rm(dir, { recursive: true, force: true });
  });
  return { runtime, dir, script };
}
test("duplicate, persist, reload and remove never edit/delete shared source", async (t) => {
  const { runtime, dir, script } = await fixture(t);
  const p = {
    ...freshProfile(),
    modelPath: script,
    executable: script,
    port: await port(),
    gpuLayers: 0,
    autoFit: false,
  };
  await runtime.save(p);
  const clone = await runtime.action("duplicate", { id: p.id });
  clone.loops = 4;
  await runtime.save(clone);
  const reload = new Runtime({ dataDir: runtime.root });
  await reload.init();
  assert.equal(reload.profiles.length, 2);
  assert.equal(reload.profiles[0].loops, 2);
  assert.equal(reload.profiles[1].loops, 4);
  assert.equal(reload.profiles[0].modelPath, reload.profiles[1].modelPath);
  await runtime.action("remove", { id: clone.id });
  assert.ok((await readFile(script, "utf8")).includes("http"));
  await reload.dispose();
});
test("owned engine switches loops only after finishing active work; unload kills owned PID", async (t) => {
  const { runtime, script } = await fixture(t);
  const a = {
    ...freshProfile(),
    executable: script,
    modelPath: script,
    port: await port(),
    gpuLayers: 0,
    autoFit: false,
  };
  const b = { ...a, id: "four_loops", port: await port(), loops: 4 };
  await runtime.save(a);
  await runtime.save(b);
  const first = await runtime.start(a);
  assert.equal(first.ready, true);
  const pid = first.child.pid;
  const response = await (await fetch(first.url + "/v1/models")).json();
  assert.match(response.override, /num_loops=int:2/);
  first.active++;
  await assert.rejects(runtime.start(b), /answering/);
  await assert.rejects(runtime.save(a), /active/);
  first.active--;
  const second = await runtime.start(b);
  assert.match(
    (await (await fetch(second.url + "/v1/models")).json()).override,
    /num_loops=int:4/,
  );
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  await runtime.stop(b.id);
  assert.equal(runtime.running.size, 0);
});
test("occupied foreign HTTP port is refused and its server is left alive", async (t) => {
  const { runtime, script } = await fixture(t);
  const server = http.createServer((q, s) => s.end("foreign"));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const p = {
    ...freshProfile(),
    modelPath: script,
    executable: script,
    port: server.address().port,
    gpuLayers: 0,
    autoFit: false,
  };
  await assert.rejects(runtime.start(p), /occupied/);
  assert.equal(
    await (await fetch("http://127.0.0.1:" + p.port)).text(),
    "foreign",
  );
  assert.equal(runtime.running.size, 0);
});
test("disabled profiles and pre-aborted loads do not spawn", async (t) => {
  const { runtime, script } = await fixture(t);
  const p = {
    ...freshProfile(),
    modelPath: script,
    executable: script,
    gpuLayers: 0,
    autoFit: false,
  };
  await assert.rejects(runtime.start({ ...p, enabled: false }), /disabled/);
  await assert.rejects(runtime.start(p, { signal: AbortSignal.abort() }));
  assert.equal(runtime.running.size, 0);
});
test("purge removes only plugin checkpoints and refuses active work", async (t) => {
  const { runtime, dir } = await fixture(t);
  await (
    await import("node:fs/promises")
  ).mkdir(join(runtime.root, "cache"), { recursive: true });
  await writeFile(join(runtime.root, "cache", "snapshot"), "cached");
  const model = join(dir, "external.gguf");
  await writeFile(model, "weights");
  const p = { ...freshProfile(), modelPath: model };
  await runtime.save(p);
  runtime.running.set(p.id, { active: 1 });
  await assert.rejects(runtime.purgeCache(), /active work/);
  runtime.running.delete(p.id);
  await runtime.purgeCache();
  assert.equal(await readFile(model, "utf8"), "weights");
  assert.equal(runtime.find(p.id).modelPath, model);
  await assert.rejects(readFile(join(runtime.root, "cache", "snapshot")), {
    code: "ENOENT",
  });
});
test("startup error keeps the diagnostic before a long usage manual", async (t) => {
  const { runtime, dir } = await fixture(t),
    executable = join(dir, "bad-server");
  await writeFile(
    executable,
    `#!${process.execPath}\nprocess.stderr.write('error: unknown argument --not-a-flag\\nusage: llama-server\\n'+'manual help text '.repeat(10000));process.exitCode=2;`,
  );
  await chmod(executable, 0o700);
  const p = {
    ...freshProfile(),
    executable,
    modelPath: executable,
    port: await port(),
    autoFit: false,
    gpuLayers: 0,
  };
  await assert.rejects(runtime.start(p), (error) => {
    assert.match(error.message, /unknown argument --not-a-flag/);
    assert.ok(error.message.length < 3000);
    return true;
  });
  assert.equal(runtime.running.size, 0);
});
