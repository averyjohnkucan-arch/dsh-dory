# Dory inference for DeepSeek Harness

A standalone Cordis plugin, modeled on the profile-management pattern of `dsh-strata` and `dsh-ninfer`. It registers the **Dory** provider and a **Dory** card under **My Models**. It does not modify either existing engine plugin, DSH core, the chat UI, or source weights.

## Profiles and loops

Add a model, choose its GGUF and a **Dory-enabled llama-server** binary, and save. Duplicate it to create independently named profiles such as `Dory · 1 loop` through `Dory · 4 loops`. All four can point to the **same file**; no copying or re-quantization is needed. Select the desired profile in the standard chat model picker. Each profile has its own context, loop count, KV cache mode/precision, sampling, batch sizes, GPU settings and port. Two loops is the default. The supported loop range is 1–4.

Loops are engine startup settings, not per-request hints. Profile switching uses the existing optional `modelScheduler` Cordis service to unload/reload owned engines. Multiple concurrent profiles never share a single engine's changing loop configuration. Without the scheduler, one Dory engine runs per GPU; foreign GPU processes cause admission refusal and are never stopped. The plugin never attaches to an unrelated server on the same port.

## Runtime

This plugin manages the **Dory-enabled llama.cpp server**, not a new inference implementation. Stock llama.cpp versions without Dory support will fail. NVIDIA documents the Dory implementation at [llama.cpp PR30306](https://github.com/ggml-org/llama.cpp/pull/30306), and a separate [vLLM PR60149](https://github.com/vllm-project/vllm/pull/60149); this release does **not** manage vLLM or claim NInfer supports Dory.

The package includes a pinned standalone runtime builder. See [portable runtime setup](docs/runtime-setup.md) to provision it through this plugin. You can also use NVIDIA's [model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16#loop-count-and-kv-cache) to obtain/build a compatible binary. Model and executable paths are chosen locally. There are no personal absolute paths or weights bundled here. The default native context is 262,144; memory fit depends on the selected weights, loop count, KV mode and hardware. Selecting a KV format does not guarantee that a particular binary supports that combination. Startup errors remain visible in the settings card.

The default `per_loop` KV mode retains separate recurrent-loop caches. `last_loop` is an explicit optional memory/behavior tradeoff. Reasoning stays enabled, matching NVIDIA's published setup; this plugin does not invent unsupported reasoning effort levels or promise quality improvements for extra loops.

## Sampling defaults

NVIDIA recommends **temperature 1.0, top P 0.95**. The plugin explicitly sets neutral defaults for other controls: top K0 (disabled), min P0, typical P1, repetition penalty1, presence/frequency penalties0, Mirostat0, DRY multiplier0 and XTC probability0. These neutral values are not additional NVIDIA recommendations. Settings are independently editable per profile, and are applied to the actual outgoing generation request, including tool continuations. Defaults do not impose a fixed random seed.

## Install

Install this package into your DSH plugin environment using its normal plugin manager or package workflow, then enable the bundled `cordis.patch.yml`. The client uses the standard `settings.models.footer` slot; the server uses `llm.registerAdapter`, the owner-capability web endpoint and optional `modelScheduler` hooks. All registrations and owned processes are disposed on unload.

The only persistent data is the plugin-owned `dsh-dory/profiles.json` under `DSH_HOME` (or `~/.dsh`), overridable through `dataDir`. Creating or removing profiles never deletes model files. This plugin does not change your default chat model or import existing profiles automatically. It does not implement portable on-disk KV checkpoints; native in-process cache behavior remains the engine's responsibility.

## Development and validation

Requires Node.js22.19+ and DSH0.2.1-rc.2. Install peer dependencies, then run `npm test` and `npm run check`. Tests use local CPU HTTP fixtures for lifecycle and request wiring; they are distinct from real-model GPU correctness, fit and speed qualification. See `docs/validation.md` for the recorded results and limitations.

`lib/process.js` was adapted from the user's MIT-licensed dsh-strata plugin; its existing ownership-aware termination pattern is preserved. No runtime import of either other engine plugin is needed.

Named function choices are translated to the pinned runtime’s `required` mode with only the selected tool declaration. The plugin preserves the tool argument schema and rejects missing or ambiguous names, instead of allowing the runtime to silently use `auto`.

## Recommended models and verified downloads

Open **Recommended models · exact revisions and hashes** in this plugin's settings card. The catalog records the checkpoints/components from the owner's configured setup with immutable repository revisions and SHA-256 (or Git blob hashes for small snapshot assets). Expand **Files, sizes and exact identities** before selecting a set.

**Download / verify recommended** saves a complete pinned set in this plugin's private `recommended-models` directory. Downloads resume from partial files, validate content before publishing final files, preserve existing models, and expose progress, cancellation and explicit failures. Repeating the action verifies/reuses existing files. Downloads do not start inference. **Add downloaded files** fills the existing model import/edit workflow for review and saving. Runtime installation remains separate.

Some configured artifacts are locally converted or assembled from multiple sources. Their exact local hashes are listed, but downloading the original publisher checkpoint cannot recreate those bytes. Use **Add existing model** and the normal importer for those entries. No incomplete component set is presented as a working download. Recommendations describe the saved setup; they do not establish memory fit or model quality on another computer.
