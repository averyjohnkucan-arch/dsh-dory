# Validation — 2026-10-28

## Automated checks

29 Node tests pass. They exercise the real React settings card in jsdom and local HTTP child processes, including:

- Independent loop profiles, model names in provider catalogs, persistence and exact outgoing context/KV/sampling settings.
- Browser → recursive folder scan → add-model flow through the authenticated action endpoint. Directory-link cycles, complete/missing shards, other architectures and malformed/oversized GGUF headers are covered. The Node header reader inspects a sparse 8 GiB fixture without mapping its payload.
- Portable export/import after files are moved and renamed: exact size plus MD5 matching, reconstructed shard names, missing pieces and exclusion of commands, executable paths and environment variables.
- Checkpoint restart, compatibility isolation, LRU eviction, failure preservation and refusal to replace a checkpoint after failed, cancelled or incomplete DSH streams. Purge leaves models/profiles intact and refuses active work.
- Native benchmark timing reports and per-profile persistence, runtime file/source verification, archive installation/reuse/repair, checksum rejection and cancellation cleanup, process ownership and cancellation, occupied foreign ports, startup diagnostics before long usage manuals, Cordis registration/disposal, endpoint authentication and native tool-choice translation.

`pnpm run check`, `git diff --check` and package inspection are also required. These automated tests need no GPU or model download.

## Real model checks

The existing Dory 1.0 4B BF16 GGUF was used directly: 7,958,360,896 bytes, MD5 `fcf3c112688a79514f28a67c79522a61`. Weights were not modified or copied. The source-matched native server reports commit `98a74c97`.

Four recovered Desktop JSONs, for loops 1–4, each passed the real importer in isolated state. They retain native 262,144 context, FP16/FP16 KV, `per_loop` mode and the old loop-specific thread/batch settings. They contain no old executable/library paths. Native fitting remains enabled.

Each loop count loaded, generated tokens, saved a native checkpoint, fully stopped/restarted and restored it. FP16, Q8 and Q4 KV were exercised. All four also loaded at 262,144 context with FP16 KV. Loops 3 and 4 needed CPU offload and were substantially slower. These were short-prompt capacity checks, not populated-256K throughput or quality tests.

A real DSH PiAi adapter check at 8,192 context and Q8/Q8 KV completed two arithmetic replies, restarting between them. The first evaluated 27 prompt tokens; the second reused 22 and evaluated 5. Both finished normally and saved checkpoints. Unauthenticated native `/slots` access returned HTTP 401. Ephemeral native credentials are excluded from exported configs and benchmark reports.

Small-context direct checks measured roughly 53, 35, 26 and 20 decode tokens/second for loops 1–4 (4,096 context, BF16 weights; loops 1–3 FP16 KV, loop 4 Q4 KV). These were short 128-token thinking samples, not sustained long-context benchmarks. Higher loops did not meet the owner's 60-token/second target.

## Hosted runtime

The hosted build uses the same source commit/tree, CUDA architecture 120 and the existing FP16/Q8/Q4 attention combinations. It bundles non-driver libraries and requires the host NVIDIA driver and glibc 2.39+. Engine source is not patched. A fresh download verified the pinned manifest/archive and all 23 shipped files (about 623 MiB unpacked), then reused the installation without replacement. With external library paths cleared, the hosted binary completed two DSH adapter replies across a full engine restart, reused 22 prompt tokens, enforced native authentication and saved checkpoints. Its benchmark job saved approximately 147.5 prefill and 34.5 decode tokens/second at 8,192 context, two loops, BF16 weights and Q8/Q8 KV. These are short-prompt measurements on the test GPU.

## Limits

No live DSH installation, routing, existing profile or other engine plugin was replaced. Strata's engine was not modified. The UI screenshot is an isolated preview of the actual Dory client.

Dory offers native memory fitting, not Strata's Thorough tuner. The plugin preserves selected context/KV settings and saves the fitting policy and benchmark report. Placement is recalculated at load. Loops are load-time settings; this engine offers no MTP, DFlash or vision projector. Checkpoint persistence was tested across engine restarts, not by rebooting the PC. Power-loss recovery, every model, other operating systems and GPUs outside the hosted build are not qualified.
