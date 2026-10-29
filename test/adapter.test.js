import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { DoryAdapter, waitForTurn } from "../lib/adapter.js";
import { freshProfile } from "../lib/profiles.js";
test("queued cancellation returns without cancelling the preceding request", async () => {
  let done,
    finished = false;
  const prior = new Promise((r) => {
    done = () => {
      finished = true;
      r();
    };
  });
  const controller = new AbortController();
  const queued = waitForTurn(prior, controller.signal);
  controller.abort(new Error("cancelled fixture"));
  await assert.rejects(queued, /cancelled fixture/);
  assert.equal(finished, false);
  done();
  await waitForTurn(prior);
  assert.equal(finished, true);
});
test("DSH adapter streams via standard wire with per-profile sampler and balanced lease", async (t) => {
  const bodies = [];
  const server = http.createServer(async (req, res) => {
    let text = "";
    for await (const c of req) text += c;
    bodies.push(JSON.parse(text));
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(
      "data: " +
        JSON.stringify({
          id: "test",
          object: "chat.completion.chunk",
          created: 1,
          model: "fixture",
          choices: [
            {
              index: 0,
              delta: { role: "assistant", content: "OK" },
              finish_reason: null,
            },
          ],
        }) +
        "\n\n",
    );
    res.write(
      "data: " +
        JSON.stringify({
          id: "test",
          object: "chat.completion.chunk",
          created: 1,
          model: "fixture",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }) +
        "\n\n",
    );
    res.end("data: [DONE]\n\n");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const p = {
    ...freshProfile(),
    id: "fixture",
    port: server.address().port,
    loops: 3,
  };
  let acquired = 0,
    released = 0;
  const state = { active: 0, gate: Promise.resolve() };
  const runtime = {
    profiles: [p],
    acquire: async (profile, signal) => {
      acquired++;
      assert.equal(profile.loops, 3);
      return { state, signal, release: () => released++ };
    },
    onChange: () => {},
  };
  const adapter = new DoryAdapter({}, runtime);
  assert.equal((await adapter.listModels())[0].provider, "dory");
  const prepared = await adapter.prepareCall("dory", "fixture");
  assert.equal(prepared.model.reasoning.defaultEffort, "on");
  for await (const chunk of prepared.stream({
    provider: "dory",
    model: "fixture",
    messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
    reasoningEffort: "on",
    maxTokens: 8,
  }))
    assert.ok(
      chunk.type !== "finish" ||
        !["error", "aborted"].includes(chunk.reason?.kind),
      JSON.stringify(chunk),
    );
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].temperature, 1);
  assert.equal(bodies[0].top_p, 0.95);
  assert.equal(bodies[0].top_k, 0);
  assert.equal(bodies[0].repeat_penalty, 1);
  assert.equal(bodies[0].presence_penalty, 0);
  assert.equal(bodies[0].frequency_penalty, 0);
  assert.equal(bodies[0].chat_template_kwargs.enable_thinking, true);
  assert.equal(acquired, 1);
  assert.equal(released, 1);
  assert.equal(state.active, 0);
  await assert.rejects(async () => {
    for await (const c of prepared.stream({
      provider: "dory",
      model: "fixture",
      messages: [],
      reasoningEffort: "off",
    })) {
    }
  }, /thinking mode/);
  assert.equal(acquired, 1);
});
test("only a successful finish replaces the session checkpoint; errors and interrupted streams retain it", async () => {
  const p = freshProfile(),
    state = { active: 0, gate: Promise.resolve(), cacheDirectory: "/fixture" };
  let restored = 0,
    saved = 0,
    released = 0;
  const runtime = {
    profiles: [p],
    cache: { restore: async () => restored++, save: async () => saved++ },
    acquire: async () => ({ state, release: () => released++ }),
    onChange: () => {},
  };
  const adapter = new DoryAdapter({}, runtime);
  let reason = "stop";
  adapter.delegate = () => ({
    resolveModel: async () => ({}),
    prepareCall: async () => ({
      async *stream() {
        yield { type: "text-delta", text: "test" };
        if (reason) yield { type: "finish", reason: { kind: reason } };
      },
    }),
  });
  for (const outcome of ["stop", "error", "aborted", null]) {
    reason = outcome;
    for await (const chunk of adapter.stream({
      provider: "dory",
      model: p.id,
      sessionId: "session",
    })) {
    }
  }
  assert.equal(saved, 1);
  assert.equal(restored, 4);
  assert.equal(released, 4);
  assert.equal(state.active, 0);
});
