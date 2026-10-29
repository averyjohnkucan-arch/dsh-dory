import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { apply } from "../index.js";
test("Cordis registration owns provider, authenticated endpoint and full unload lifecycle", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dory-hooks-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const disposers = [];
  let handler,
    injectIndex,
    provider,
    unregistered = false;
  const reg = () => {
    unregistered = true;
  };
  reg.replace = () => {};
  const ctx = {
    llm: {
      registerAdapter(ids, adapter) {
        provider = { ids, adapter };
        return reg;
      },
    },
    webServer: {
      getOrigin: () => "http://localhost:3080",
      register(spec) {
        handler = spec.handler;
        return () => {};
      },
    },
    effect(fn) {
      const d = fn();
      if (d) disposers.push(d);
    },
    on(name, fn) {
      assert.equal(name, "webserver/index-inject");
      injectIndex = fn;
    },
    inject() {},
  };
  await apply(ctx, { dataDir: root });
  assert.deepEqual(provider.ids, ["dory"]);
  const table = [];
  injectIndex(table);
  assert.equal(table[0].name, "__DSH_DORY__");
  const token = table[0].value.token;
  async function call({
    authorization = "Bearer " + token,
    method = "POST",
    origin = "http://localhost:3080",
    body = { action: "list" },
  } = {}) {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    req.method = method;
    req.headers = { authorization, origin, "content-type": "application/json" };
    const res = {
      status: 200,
      setHeader() {},
      writeHead(s) {
        this.status = s;
      },
      end(text) {
        this.value = JSON.parse(text);
      },
    };
    await handler(req, res);
    return res;
  }
  assert.equal((await call({ authorization: "" })).status, 401);
  assert.equal((await call({ origin: "http://foreign.invalid" })).status, 403);
  assert.equal((await call({ method: "GET" })).status, 405);
  assert.equal((await call()).value.result.profiles.length, 0);
  const fresh = (await call({ body: { action: "new" } })).value.result;
  assert.equal(fresh.loops, 2);
  assert.equal(
    (await call({ body: { action: "save", payload: fresh } })).status,
    200,
  );
  assert.equal((await provider.adapter.listModels())[0].name, "Dory · 2 loops");
  for (const dispose of disposers.reverse()) await dispose();
  assert.equal(unregistered, true);
});
