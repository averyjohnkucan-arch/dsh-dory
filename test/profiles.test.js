import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProfile,
  validateProfile,
  launchArgs,
  applySampling,
  defaultSampling,
} from "../lib/profiles.js";
test("same weights can have four independent native loop configurations", () => {
  const profiles = [1, 2, 3, 4].map((loops) => ({
    ...freshProfile(),
    loops,
    modelPath: "/models/Dory BF16.gguf",
    executable: "/runtime/llama-server",
  }));
  assert.equal(new Set(profiles.map((p) => p.id)).size, 4);
  for (const p of profiles) {
    const a = launchArgs(p);
    assert.equal(a[a.indexOf("--model") + 1], p.modelPath);
    assert.equal(a[a.indexOf("--ctx-size") + 1], "262144");
    assert.equal(
      a[a.indexOf("--override-kv") + 1],
      `dory.num_loops=int:${p.loops},dory.recurrent_kv_cache_mode=str:per_loop`,
    );
    assert.equal(a[a.indexOf("--reasoning") + 1], "on");
  }
  profiles[0].sampling.temperature = 0.6;
  assert.equal(profiles[1].sampling.temperature, 1);
});
test("invalid loop/context/CLI and malformed profiles fail before spawning", () => {
  for (const patch of [
    { loops: 0 },
    { loops: 5 },
    { loops: 1.5 },
    { loops: 10 },
    { context: 262145 },
    { kvMode: "invented" },
    { port: 80 },
    { extraArgs: ["--override-kv", "dory.num_loops=int:10"] },
    { options: { "--override-kv": "dory.num_loops=int:10" } },
    { options: { "--host": "0.0.0.0" } },
    { options: { "--ctx-size": 4096 } },
    { sampling: { ...defaultSampling, temperature: NaN } },
  ])
    assert.throws(() => validateProfile({ ...freshProfile(), ...patch }));
});
test("published sampler and neutral transforms are sent without dropping tools", () => {
  const p = freshProfile();
  const body = {
    temperature: 0.1,
    top_p: 0.1,
    tools: [{ name: "test" }],
    chat_template_kwargs: { x: 1 },
  };
  applySampling(body, p);
  assert.equal(body.temperature, 1);
  assert.equal(body.top_p, 0.95);
  assert.equal(body.top_k, 0);
  assert.equal(body.presence_penalty, 0);
  assert.equal(body.frequency_penalty, 0);
  assert.equal(body.repeat_penalty, 1);
  assert.equal(body.min_p, 0);
  assert.equal(body.typical_p, 1);
  assert.equal(body.mirostat, 0);
  assert.equal(body.chat_template_kwargs.enable_thinking, true);
  assert.equal(body.chat_template_kwargs.x, 1);
  assert.deepEqual(body.tools, [{ name: "test" }]);
});
test("native fit preserves selected context and KV without forcing GPU layers", () => {
  const p = { ...freshProfile(), context: 65536, kvK: "q4_0", kvV: "q4_0" },
    a = launchArgs(p);
  assert.equal(a[a.indexOf("--fit") + 1], "on");
  assert.equal(a[a.indexOf("--fit-ctx") + 1], "65536");
  assert.equal(a[a.indexOf("--ctx-size") + 1], "65536");
  assert.equal(a.includes("--n-gpu-layers"), false);
  assert.equal(a[a.indexOf("--cache-type-k") + 1], "q4_0");
  const manual = launchArgs({ ...p, autoFit: false, gpuLayers: 12 });
  assert.equal(manual[manual.indexOf("--n-gpu-layers") + 1], "12");
  assert.equal(manual[manual.indexOf("--fit") + 1], "off");
});
