# Portable Dory runtime setup

The plugin includes its own runtime builder and exact public source pin in `lib/engine.json`. It does not import another engine plugin or require this developer’s runtime paths. Existing profiles and executables are preserved.

From the installed package directory, run:

```sh
node scripts/build-engine.js --root /your/dory-runtime --jobs 2
```

Prerequisites: Git, Node22.19+, CMake, Ninja, a C/C++ compiler, an NVIDIA driver and a compatible CUDA development toolkit. Set `CMAKE` or `DORY_CMAKE_ARGS` for an explicit toolchain. The CUDA architecture is detected or selected with `--arch`. This workflow currently provisions CUDA; it does not claim AMD, Intel or NPU runtime support.

The builder verifies the exact commit and source tree, then builds a revision-specific directory. Set the executable path returned in `DSH_RESULT` on your Dory profile. The model file is imported separately through the normal profile editor. Without `--root`, the owning directory is under `DSH_HOME/dsh-dory/engines` or `~/.dsh/dsh-dory/engines`.

For source-only preparation, use `--prepare-only`. Neither preparing source nor compiling proves model fit, tool correctness or speed. Each loop profile still requires independent native-context and live-harness validation. Run builds separately from timed inference; builds do not stop foreign processes or automatically start a model.
