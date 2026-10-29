import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import http from "node:http";
import { Runtime } from "../lib/runtime.js";
import { freshProfile } from "../lib/profiles.js";
test("benchmark job reports native prefill/decode and persists exact settings without changing context or KV", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dory-bench-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, "llama-server");
  await writeFile(
    executable,
    `#!${process.execPath}\nimport http from 'node:http';const args=process.argv;const value=k=>args[args.indexOf(k)+1];http.createServer(async(q,s)=>{s.setHeader('Content-Type','application/json');if(q.url==='/v1/models'){s.end(JSON.stringify({data:[{id:value('--alias')}]}));return;}let body='';for await(const b of q)body+=b;body=JSON.parse(body);if(body.cache_prompt!==false||body.id_slot!==0){s.writeHead(400);s.end('{}');return;}s.end(JSON.stringify({timings:{prompt_n:27,prompt_per_second:1234.5,predicted_n:128,predicted_per_second:62.75}}));}).listen(Number(value('--port')),'127.0.0.1');`,
  );
  await chmod(executable, 0o700);
  const socket = http.createServer();
  await new Promise((r) => socket.listen(0, "127.0.0.1", r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const runtime = new Runtime({ dataDir: join(root, "state") });
  await runtime.init();
  t.after(() => runtime.dispose());
  const p = {
    ...freshProfile(),
    modelPath: executable,
    executable,
    port,
    context: 65536,
    maxTokens: 128,
    loops: 3,
    kvK: "q8_0",
    kvV: "q4_0",
    autoFit: false,
    gpuLayers: 0,
  };
  await runtime.save(p);
  const { id } = await runtime.action("benchmark", { id: p.id });
  await runtime.jobs.items.get(id).promise;
  const job = runtime.jobs.list().find((j) => j.id === id);
  assert.equal(job.status, "complete", job.error);
  assert.deepEqual(job.metrics, { prefill: 1234.5, decode: 62.75 });
  assert.equal(runtime.running.size, 0);
  const reload = new Runtime({ dataDir: runtime.root });
  await reload.init();
  const saved = reload.find(p.id);
  assert.equal(saved.context, 65536);
  assert.equal(saved.kvV, "q4_0");
  assert.equal(saved.tuneReport.decode, 62.75);
  assert.equal(saved.tuneReport.settings.loops, 3);
  await reload.dispose();
});
