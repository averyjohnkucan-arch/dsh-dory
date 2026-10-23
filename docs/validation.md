# Validation — 2026-10-23

The standalone package was tested without installing it into the production DSH host or modifying its plugins, model profiles, routing, or configuration.

## Automated checks

Eleven Node tests pass:

- Four independent loop-count profiles can reference the same weight file; launch arguments retain exact context, loop count, KV mode and reasoning-on settings.
- Invalid loop counts (including10), unsupported modes, malformed sampling, port/context limits, and managed-option override attempts are rejected before spawning.
- Publisher temperature/top-P and neutral ancillary sampling reach the actual HTTP request through DSH's PiAi adapter; standard streaming works and leases are balanced.
- Cancelled queued generation returns without cancelling the preceding request.
- The actual React settings card runs in jsdom: Add, loop selection, Save, Duplicate and a different loop count preserve independent profiles referencing the same source.
- Cordis provider registration, model catalog refresh, owner-capability endpoint authentication, method/origin checks, and unload disposal are exercised.
- Persistence/reload/removal preserve the shared source file.
- A CPU HTTP engine fixture demonstrates loop-argument changes on profile switches, active-request edit/switch refusal, and owned-process termination.
- Foreign occupied ports remain untouched; disabled and pre-aborted loads do not spawn.

`npm run check` and package contents inspection also pass. The development environment uses the already installed DSH peer modules read-only; React/jsdom fixtures were installed in an isolated temporary directory. No production dependency installation or host reload was performed.

## Limits

These are plugin contract, UI and local HTTP/process integration tests, not GPU model-quality or throughput claims. No native Dory GPU job was started by this plugin. The independently running model-tuning batch is still testing the model/engine; its long-context tool-call failure is not declared fixed by these plugin tests. Quantization/precision support and memory fit depend on the selected Dory-enabled runtime. Switching loop counts requires engine reload; the plugin does not claim per-request native loop mutation or on-disk KV checkpoint portability.

The plugin does not add controls to the chat composer. The standard model picker selects a saved Dory profile, exactly as requested in the final scope.
