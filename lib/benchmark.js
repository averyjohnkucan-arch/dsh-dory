import { launchArgs } from "./profiles.js";

/** Native memory fitting runs at startup; this measures the selected settings without a parameter search. */
export async function benchmark(runtime, id, signal, report) {
  const p = structuredClone(runtime.find(id));
  await runtime.unload(id); // A running server may have been loaded with a different fit policy.
  report(
    p.autoFit
      ? "Starting native memory fit. Your selected context and KV precision are preserved."
      : "Starting the saved manual placement settings.",
  );
  const lease = await runtime.acquire(p, signal),
    state = lease.state;
  state.active++;
  try {
    report("Measuring prefill and decode…");
    const response = await fetch(state.url + "/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(state.apiKey ? { Authorization: "Bearer " + state.apiKey } : {}),
      },
      body: JSON.stringify({
        model: p.id,
        messages: [
          { role: "user", content: "Explain how a bicycle works in detail." },
        ],
        max_tokens: Math.min(256, p.maxTokens),
        temperature: 0,
        id_slot: 0,
        cache_prompt: false,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error?.message || "Native benchmark failed.");
    const t = result.timings;
    if (
      !Number.isFinite(t?.prompt_per_second) ||
      !Number.isFinite(t?.predicted_per_second)
    )
      throw Error("Engine did not report prefill/decode timings.");
    const metrics = {
      prefill: t.prompt_per_second,
      decode: t.predicted_per_second,
    };
    report("Measurement complete", metrics);
    const reportValue = {
      measuredAt: new Date().toISOString(),
      ...metrics,
      promptTokens: t.prompt_n,
      outputTokens: t.predicted_n,
      settings: {
        context: p.context,
        loops: p.loops,
        kvMode: p.kvMode,
        kvK: p.kvK,
        kvV: p.kvV,
        autoFit: p.autoFit,
      },
      generation: {
        maxTokens: Math.min(256, p.maxTokens),
        temperature: 0,
        cachePrompt: false,
      },
      launchArgs: launchArgs(p),
      nativeTimings: t,
      note: "Short prompt measurement; long-context speed and quality are not qualified.",
    };
    signal?.throwIfAborted();
    const saved = runtime.find(id);
    saved.tuneReport = reportValue;
    await runtime.persist();
    runtime.onChange();
    return reportValue;
  } finally {
    state.cacheSession = undefined;
    state.active--;
    lease.release();
    runtime.onChange();
    // Leave fitting measurements independent of the next conversation's slot.
    await runtime.unload(id);
  }
}
