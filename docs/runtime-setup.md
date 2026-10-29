# Dory runtime

The default runtime is installed automatically from this repository's pinned GitHub release. The plugin checks the manifest, compressed archive, extracted executable and every shipped library before use. Activity provides cancellation and retry. Partial downloads never become an installed runtime.

The hosted build targets Linux x64, glibc 2.39+, CUDA 13.1 and SM120. It includes CUDA runtime, cuBLAS, ggml and C++ runtime libraries. The host NVIDIA driver remains external. Library notices and pinned source provenance travel with the runtime. Model weights are separate.

## Other hardware or an existing server

Open a model's Advanced settings and choose a compatible Dory-enabled `llama-server`. A custom binary must support Dory's loop/KV-mode overrides, the selected KV formats, memory fitting and native slot save/restore for enabled features. Clear the custom path to return to the managed runtime.

For an explicit local source build:

```sh
node scripts/build-engine.js --root /absolute/runtime/folder --arch 120 --jobs 2
```

This advanced fallback requires Git, CMake, Ninja and a compatible CUDA development toolkit. The builder verifies the commit and tree in `lib/engine.json` and refuses a modified source checkout. Select the resulting executable in Advanced settings. `--prepare-only` fetches and verifies source without compiling. No code from your old installation or another plugin is required.

Runtime installation is distinct from model qualification. A successful build or download does not establish long-context throughput, memory fit or model quality on other hardware.
