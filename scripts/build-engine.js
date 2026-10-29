import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../lib/process.js";
const pkg = dirname(dirname(fileURLToPath(import.meta.url)));
const pin = JSON.parse(await readFile(join(pkg, "lib/engine.json"), "utf8"));
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const root = join(
  resolve(
    arg("--root") ||
      join(
        process.env.DSH_HOME || join(homedir(), ".dsh"),
        "dsh-dory",
        "engines",
      ),
  ),
  pin.revision,
);
const source = join(root, "source"),
  build = join(root, "build");
const execute = (command, args, cwd = root) =>
  run(command, args, {
    cwd,
    timeout: 7200000,
    onData: (x) => process.stdout.write(x),
  });
await mkdir(root, { recursive: true });
try {
  try {
    await access(join(source, ".git"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await execute("git", ["init", source]);
    await execute("git", ["remote", "add", "origin", pin.source], source);
    await execute(
      "git",
      ["fetch", "--depth", "1", "origin", pin.revision],
      source,
    );
    await execute("git", ["checkout", "--detach", "FETCH_HEAD"], source);
  }
  const revision = (
    await execute("git", ["rev-parse", "HEAD"], source)
  ).stdout.trim();
  const tree = (
    await execute("git", ["rev-parse", "HEAD^{tree}"], source)
  ).stdout.trim();
  if (revision !== pin.revision || tree !== pin.tree)
    throw Error(
      "Runtime source does not match the packaged pin; use a clean root.",
    );
  await execute("git", ["diff", "--exit-code", "HEAD"], source);
  if (
    (
      await execute(
        "git",
        ["ls-files", "--others", "--exclude-standard"],
        source,
      )
    ).stdout.trim()
  )
    throw Error(
      "Unexpected files in runtime source; preserve them and use a clean root.",
    );
  await access(join(source, "src/models/dory.cpp"));
  if (process.argv.includes("--prepare-only")) {
    console.log(
      "DSH_RESULT=" +
        JSON.stringify({
          source,
          revision,
          tree,
          preparedOnly: true,
          qualified: false,
        }),
    );
  } else {
    const compute =
      arg("--arch") ||
      (
        await execute("nvidia-smi", [
          "--query-gpu=compute_cap",
          "--format=csv,noheader",
        ])
      ).stdout
        .split(/\r?\n/)[0]
        .trim()
        .replace(".", "");
    if (!/^\d{2,3}[af]?$/.test(compute))
      throw Error("Cannot detect CUDA architecture; select --arch explicitly.");
    const jobs = arg("--jobs") || "2";
    if (!/^[1-9]\d?$/.test(jobs)) throw Error("Build jobs must be1–99.");
    const cmake = process.env.CMAKE || "cmake";
    await execute(cmake, [
      "-S",
      source,
      "-B",
      build,
      "-G",
      "Ninja",
      "-DCMAKE_BUILD_TYPE=Release",
      "-DGGML_CUDA=ON",
      "-DGGML_NATIVE=OFF",
      "-DGGML_CUDA_FA_ALL_QUANTS=ON",
      "-DLLAMA_CURL=OFF",
      "-DLLAMA_BUILD_TESTS=OFF",
      "-DCMAKE_CUDA_ARCHITECTURES=" + compute,
      ...(process.env.DORY_CMAKE_ARGS
        ? JSON.parse(process.env.DORY_CMAKE_ARGS)
        : []),
    ]);
    await execute(cmake, [
      "--build",
      build,
      "--target",
      "llama-server",
      "--parallel",
      jobs,
    ]);
    const executable = join(
      build,
      "bin",
      process.platform === "win32" ? "llama-server.exe" : "llama-server",
    );
    const sha256 = createHash("sha256")
      .update(await readFile(executable))
      .digest("hex");
    const receipt = {
      source,
      revision,
      tree,
      executable,
      sha256,
      architecture: compute,
      qualified: false,
      note: "Runtime build only; real model capacity,quality and speed remain unverified.",
    };
    await writeFile(
      join(root, "build-receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log("DSH_RESULT=" + JSON.stringify(receipt));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
