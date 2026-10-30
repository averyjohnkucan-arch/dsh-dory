# Dory for DeepSeek Harness

Install `https://github.com/averyjohnkucan-arch/dsh-dory` through DSH's plugin manager. The **Dory** provider appears under Models. This plugin is independent of Strata and NInfer.

## Set up a model

1. Choose **Import files** and open your model folder. Scan it, including subfolders, or select a GGUF directly.
2. The Files view separates complete models from models missing shards. Expand a model to see every shard and its role. Weights stay where they are.
3. Open **Settings**. Set the model name, loops, context and K/V precision, then save or **Save and benchmark**.
4. Select the saved name in DSH's chat model picker. Duplicate a profile to keep separate 1-, 2-, 3- and 4-loop setups using the same weights.

The default context is native (262,144 tokens for Dory 1.0); shorter choices use 32K increments. K/V formats are FP16, Q8 and Q4, the formats supported by this runtime build. Matching K/V formats use dedicated attention kernels; mixed pairs use a slower FP16 attention fallback. The model's weight quantization and its KV precision are separate settings.

Dory uses recurrent loops rather than MTP or DFlash. This runtime is text only: there are no MTP, draft-model or vision-projector files to select. Two loops and `per_loop` KV mode follow [NVIDIA's reference setup](https://huggingface.co/nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16). `last_loop` is an explicit smaller-cache behavior tradeoff. Loops and KV format take effect when the engine reloads.

## Runtime and fitting

The plugin downloads its checksum-pinned Dory-enabled llama.cpp runtime from this repository's GitHub release automatically. Activity shows progress, cancellation and a retry button. No compiler or other inference plugin is required on the supported platform: **Linux x64, glibc 2.39+, CUDA 13-compatible NVIDIA driver, SM120 GPU**. The host supplies the NVIDIA driver. Other systems can use a compatible Dory server through Advanced settings or the source builder in [runtime setup](docs/runtime-setup.md).

New profiles let the native engine fit GPU placement to available memory. Your selected context and KV precision remain explicit. **Benchmark settings** measures the current profile and displays native **prefill and decode tokens/second**. Activity shows “Measuring…” until the completed sample arrives. The measurement and settings are saved per profile. Native placement is recalculated at each load; this is memory fitting plus a short benchmark, not Strata's Thorough parameter search or a long-context quality test. Turn fitting off in Advanced settings to set GPU layers manually.

Names, sampling, loop count, memory settings and ports belong to the saved profile. Renaming retains its identity and model files and updates the standard model picker. Editing a loaded profile unloads it; the next load uses the saved settings. Active answers cannot be interrupted by an edit or purge.

## Portable model JSON

Use **More → Export config** to download a `.dsh-model.json`. It contains the name, loop/context/KV/sampling settings and every model shard's byte size and MD5. It excludes executable paths, environment variables, arbitrary CLI options, credentials and machine-specific ports.

Use **Import config**, select the JSON, then choose a model folder. The importer scans subfolders, filters by exact size, verifies MD5 and links the matched files into a private shard directory without copying weights. File locations and names may change. Missing or mismatched pieces stop the import with a clear error. MD5 identifies your existing files; it is not a signature for untrusted downloads. Hosted downloads use SHA-256.

## Conversation cache

The native server saves and restores conversation KV checkpoints to this plugin's private `cache` directory. Checkpoints survive engine switches and normal restarts/reboots. Each model has a **16 GiB SSD budget**, shared across its loop/KV configurations; least recently used checkpoints are removed first. Cache compatibility includes model identity, engine, context, loops and KV settings. The native engine still checks the token prefix when restoring a conversation. Prompt text is not stored in the catalog; the native checkpoint itself contains model state.

**Purge all cache**, at the top of the card, unloads idle owned servers and removes conversation checkpoints. Weights, profiles and runtime downloads are retained. RAM/GPU caching remains native engine behavior. A checkpoint over 16 GiB is not saved, and cache failures are visible without discarding an otherwise completed answer.

Persistent conversation caching requires the DSH session identifier. Calls without one still use native in-process prompt caching. Interrupted or failed answers do not replace a valid SSD checkpoint.

## Downloads and data

The Download tab offers NVIDIA's official Q5_K_M GGUF pinned to an immutable revision, exact size and SHA-256. The existing local BF16 conversion is also listed by identity. Downloading the original Safetensors checkpoint does not recreate that converted GGUF.

State lives under `DSH_HOME/dsh-dory` (normally `~/.dsh/dsh-dory`), or the configured `dataDir`. Plugin removal does not delete external model files. A shared model scheduler is used when available; the fallback owns one engine per GPU and refuses foreign GPU processes and occupied HTTP ports.

## Development

Node 22.19+ and DSH 0.2.1-rc.2 are required. Run `pnpm install --ignore-scripts`, `pnpm run check` and `pnpm test`. No engine process or model download is needed for the automated tests. Native validation and its limits are recorded in [validation](docs/validation.md).

The portable file matching and job queue were adapted from the user's MIT-licensed Strata/NInfer plugins. The GGUF inspector uses Node.js and has no Python dependency. They are included locally, with no runtime dependency on those plugins. Engine source stays pinned; this release adds plugin features without changing its inference implementation.

## Shared GPU handoff

Install [dsh-model-scheduler](https://github.com/averyjohnkucan-arch/dsh-model-scheduler) and restart DSH to coordinate Dory, NInfer and Strata 0.6.4+. Dory's chat, manual Load, native memory fitting and throughput benchmark all acquire the selected GPU's shared lease. Chat holds it through checkpoint saving. Benchmark requests follow scheduler cancellation as well as the job's Cancel button. Without the optional scheduler, unload other providers yourself.

See [COMPATIBILITY.md](COMPATIBILITY.md) for supported DSH versions and upgrade checks.
