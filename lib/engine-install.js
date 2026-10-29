import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  writeFile,
  stat,
  rm,
  rename,
  chmod,
} from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { run } from "./process.js";
const pin = JSON.parse(
  await readFile(new URL("./engine.json", import.meta.url), "utf8"),
);
const base =
  "https://github.com/averyjohnkucan-arch/dsh-dory/releases/download/";
async function sha(path) {
  const hash = createHash("sha256");
  for await (const block of createReadStream(path)) hash.update(block);
  return hash.digest("hex");
}
function safeName(name) {
  return (
    typeof name === "string" &&
    name.length < 256 &&
    !name.startsWith("/") &&
    !/[\\\0]/.test(name) &&
    name.split("/").every((p) => p && p !== "." && p !== "..")
  );
}
export async function verifyRuntime(directory, signal, expected = pin) {
  const metadata = JSON.parse(
    await readFile(join(directory, "runtime.json"), "utf8"),
  );
  if (
    metadata.revision !== expected.revision ||
    metadata.tree !== expected.tree ||
    metadata.platform !== "linux-x64" ||
    !Array.isArray(metadata.files) ||
    !metadata.files.length
  )
    throw Error("Dory runtime provenance does not match the plugin.");
  for (const file of metadata.files) {
    signal?.throwIfAborted();
    if (!safeName(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256))
      throw Error("Unsafe runtime manifest.");
    const path = join(directory, file.name),
      info = await stat(path);
    if (
      !info.isFile() ||
      info.size !== file.size ||
      (await sha(path)) !== file.sha256
    )
      throw Error("Runtime checksum mismatch: " + file.name);
  }
  if (
    !metadata.files.some((f) => f.name === "llama-server") ||
    !metadata.files.some((f) => f.name === "llama-server.bin")
  )
    throw Error("Incomplete Dory runtime.");
  return join(directory, "llama-server");
}

/** A checksum-pinned hosted build; never compile or borrow another plugin's libraries during install. */
export async function installEngine(
  root,
  signal,
  report = () => {},
  request = fetch,
) {
  if (process.platform !== "linux" || process.arch !== "x64")
    throw Error(
      "Automatic Dory runtime requires Linux x64. Supply a compatible Dory server in Advanced settings on other platforms.",
    );
  const capabilities = (
    await run(
      "nvidia-smi",
      ["--query-gpu=compute_cap", "--format=csv,noheader"],
      { signal },
    )
  ).stdout
    .trim()
    .split(/\r?\n/);
  if (!capabilities.some((c) => c.trim() === "12.0"))
    throw Error(
      "The hosted Dory runtime supports SM120 GPUs. Supply a compatible Dory server in Advanced settings for another GPU.",
    );
  return installPinnedRuntime(root, pin, { signal, report, request });
}

/** Separate archive verification from hardware admission so the installer can be tested without a GPU. */
export async function installPinnedRuntime(
  root,
  expected,
  { signal, report = () => {}, request = fetch } = {},
) {
  const target = join(root, "engine", expected.runtimeRelease);
  try {
    return await verifyRuntime(target, signal, expected);
  } catch (error) {
    if (error.code !== "ENOENT")
      report("Replacing an incomplete runtime: " + error.message);
  }
  if (!/^[a-f0-9]{64}$/.test(expected.runtimeManifestSha256 || ""))
    throw Error(
      "Hosted Dory runtime is still being prepared. Retry installation once the runtime is published.",
    );
  await mkdir(join(root, "engine"), { recursive: true, mode: 0o700 });
  const work = join(root, "engine", "install-" + randomUUID());
  await mkdir(work, { mode: 0o700 });
  try {
    report("Downloading verified Dory runtime…");
    const url = base + expected.runtimeRelease + "/";
    const response = await request(url + "runtime-manifest.json", { signal });
    if (!response.ok)
      throw Error(
        "Runtime manifest download failed (" +
          response.status +
          "). Retry installation.",
      );
    const text = await response.text();
    if (
      text.length > 1024 * 1024 ||
      createHash("sha256").update(text).digest("hex") !==
        expected.runtimeManifestSha256
    )
      throw Error("Runtime manifest checksum mismatch.");
    const manifest = JSON.parse(text),
      archive = manifest.archive;
    if (
      manifest.revision !== expected.revision ||
      manifest.tree !== expected.tree ||
      !safeName(archive?.name) ||
      archive.name.includes("/") ||
      !Number.isSafeInteger(archive.size) ||
      archive.size < 1 ||
      archive.size > 2 * 1024 ** 3 ||
      !/^[a-f0-9]{64}$/.test(archive.sha256)
    )
      throw Error("Invalid Dory runtime archive.");
    const download = await request(url + archive.name, { signal });
    if (!download.ok || !download.body)
      throw Error(
        "Runtime download failed (" +
          download.status +
          "). Retry installation.",
      );
    let received = 0,
      last = 0;
    const hash = createHash("sha256");
    const progress = new Transform({
      transform(chunk, encoding, callback) {
        received += chunk.length;
        if (received > archive.size) {
          callback(Error("Runtime exceeds expected size."));
          return;
        }
        hash.update(chunk);
        if (Date.now() - last > 1000) {
          report(
            "Downloading Dory runtime: " +
              Math.floor((received / archive.size) * 100) +
              "%",
          );
          last = Date.now();
        }
        callback(null, chunk);
      },
    });
    const path = join(work, "runtime.tar.gz");
    await pipeline(
      Readable.fromWeb(download.body),
      progress,
      createWriteStream(path, { mode: 0o600 }),
      { signal },
    );
    if (received !== archive.size || hash.digest("hex") !== archive.sha256)
      throw Error(
        "Runtime archive checksum or size mismatch. Retry installation.",
      );
    report("Unpacking and checking native libraries…");
    // The compressed bytes are pinned before tar sees them. Reject unexpected archive paths too.
    const listing = await run("tar", ["-tzf", path], { signal });
    if (
      listing.stdout
        .trim()
        .split("\n")
        .some((p) => !p.startsWith("runtime/") || p.split("/").includes(".."))
    )
      throw Error("Unsafe runtime archive paths.");
    await run("tar", ["-xzf", path, "-C", work, "--no-same-owner"], {
      signal,
      timeout: 120000,
    });
    const directory = join(work, "runtime");
    await verifyRuntime(directory, signal, expected);
    await chmod(join(directory, "llama-server"), 0o755);
    await chmod(join(directory, "llama-server.bin"), 0o755);
    // Existing model files and settings never participate in runtime replacement.
    await rm(target, { recursive: true, force: true });
    await rename(directory, target);
    await writeFile(
      join(target, "install-receipt.json"),
      JSON.stringify({
        installedAt: new Date().toISOString(),
        release: expected.runtimeRelease,
        manifestSha256: expected.runtimeManifestSha256,
      }) + "\n",
      { mode: 0o600 },
    );
    report("Dory runtime ready");
    return join(target, "llama-server");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
