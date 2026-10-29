import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { verifyRuntime } from "../lib/engine-install.js";
const pin = JSON.parse(
  await readFile(new URL("../lib/engine.json", import.meta.url)),
);
test("runtime checks source provenance and every shipped executable/library before reuse", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dory-engine-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from("native fixture");
  const files = ["llama-server", "llama-server.bin"].map((name) => ({
    name,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  }));
  for (const f of files) await writeFile(join(root, f.name), bytes);
  const manifest = {
    revision: pin.revision,
    tree: pin.tree,
    platform: "linux-x64",
    files,
  };
  await writeFile(join(root, "runtime.json"), JSON.stringify(manifest));
  assert.equal(await verifyRuntime(root), join(root, "llama-server"));
  await writeFile(join(root, "llama-server.bin"), "tampered");
  await assert.rejects(verifyRuntime(root), /checksum mismatch/);
  manifest.files[0].name = "../escape";
  await writeFile(join(root, "runtime.json"), JSON.stringify(manifest));
  await assert.rejects(verifyRuntime(root), /Unsafe/);
});

test("installer verifies a complete archive, reuses it, repairs tampering and cleans failed/cancelled downloads", async (t) => {
  const { mkdir, readdir } = await import("node:fs/promises");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { installPinnedRuntime } = await import("../lib/engine-install.js");
  const root = await mkdtemp(join(tmpdir(), "dory-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "source"),
    packageRoot = join(source, "runtime");
  await mkdir(packageRoot, { recursive: true });
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex"),
    bytes = Buffer.from("fixture native executable");
  const files = ["llama-server", "llama-server.bin"].map((name) => ({
    name,
    size: bytes.length,
    sha256: digest(bytes),
  }));
  for (const file of files)
    await writeFile(join(packageRoot, file.name), bytes);
  const metadata = {
    revision: pin.revision,
    tree: pin.tree,
    platform: "linux-x64",
    files,
  };
  await writeFile(join(packageRoot, "runtime.json"), JSON.stringify(metadata));
  const archivePath = join(root, "fixture.tar.gz");
  await promisify(execFile)("tar", [
    "-czf",
    archivePath,
    "-C",
    source,
    "runtime",
  ]);
  const archive = await readFile(archivePath);
  const manifest = JSON.stringify({
      ...metadata,
      archive: {
        name: "fixture.tar.gz",
        size: archive.length,
        sha256: digest(archive),
      },
    }),
    expected = {
      ...pin,
      runtimeRelease: "fixture-release",
      runtimeManifestSha256: digest(manifest),
    };
  let requests = 0;
  const request = async (url) => {
    requests++;
    return new Response(
      url.endsWith("runtime-manifest.json") ? manifest : archive,
    );
  };
  const state = join(root, "state");
  const executable = await installPinnedRuntime(state, expected, { request });
  assert.deepEqual(await readFile(executable), bytes);
  assert.equal(requests, 2);
  await installPinnedRuntime(state, expected, { request });
  assert.equal(requests, 2);
  await writeFile(executable, "tampered");
  await installPinnedRuntime(state, expected, { request });
  assert.equal(requests, 4);
  assert.deepEqual(await readFile(executable), bytes);
  const badState = join(root, "bad");
  await assert.rejects(
    installPinnedRuntime(badState, expected, {
      request: async (url) =>
        new Response(
          url.endsWith("runtime-manifest.json")
            ? manifest
            : Buffer.alloc(archive.length),
        ),
    }),
    /checksum or size mismatch/,
  );
  assert.deepEqual(await readdir(join(badState, "engine")), []);
  const controller = new AbortController(),
    cancelState = join(root, "cancelled");
  await assert.rejects(
    installPinnedRuntime(cancelState, expected, {
      signal: controller.signal,
      request: async (url) => {
        if (url.endsWith("runtime-manifest.json"))
          return new Response(manifest);
        controller.abort();
        return new Response(archive);
      },
    }),
    /abort/i,
  );
  assert.deepEqual(await readdir(join(cancelState, "engine")), []);
});
