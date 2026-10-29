import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { exportManifest, locateFiles, validateManifest } from "./portable.js";
import { freshProfile, validateProfile } from "./profiles.js";
import { modelParts } from "./models.js";
const keys = [
  "context",
  "loops",
  "kvMode",
  "kvK",
  "kvV",
  "gpuLayers",
  "threads",
  "batchThreads",
  "batch",
  "ubatch",
  "maxTokens",
  "sampling",
  "autoFit",
  "kvCache",
];

/** Executables, environment, ports, machine IDs and arbitrary CLI flags never travel in JSON. */
export function portableSettings(value) {
  return Object.fromEntries(
    keys
      .filter((k) => value[k] !== undefined)
      .map((k) => [k, structuredClone(value[k])]),
  );
}
export async function exportConfig(runtime, id, signal, report) {
  const p = runtime.find(id),
    files = await modelParts(p.modelPath, signal);
  const value = await exportManifest(
    "dory",
    p.name,
    portableSettings(p),
    files.map((file, i) => ({
      role: i === 0 ? "model" : "part",
      path: file.path,
    })),
    { signal, report },
  );
  value.minimumPluginVersion = "0.2.0";
  return value;
}
export async function importConfig(runtime, value, root, signal, report) {
  const manifest = validateManifest(value, "dory");
  if (
    manifest.files.filter((f) => f.role === "model").length !== 1 ||
    manifest.files.some((f) => !["model", "part"].includes(f.role))
  )
    throw Error("Choose a Dory model config with its GGUF shards.");
  const files = await locateFiles(manifest, root, { signal, report });
  await mkdir(join(runtime.root, "imports"), { recursive: true });
  const directory = await mkdtemp(join(runtime.root, "imports", "config-"));
  try {
    if (new Set(files.map((f) => f.name)).size !== files.length)
      throw Error("Duplicate shard names in config.");
    for (const file of files)
      await symlink(file.path, join(directory, file.name));
    const path = join(directory, files.find((f) => f.role === "model").name);
    const parts = await modelParts(path, signal);
    if (parts.length !== files.length)
      throw Error("Config parts do not match the model shard directory.");
    const p = validateProfile({
      ...freshProfile(),
      ...portableSettings(manifest.settings),
      name: manifest.name,
      modelPath: parts[0].path,
      nativeContext: parts[0].metadata["dory.context_length"] || 262144,
      modelFiles: parts.map((f) => f.path),
    });
    while (runtime.profiles.some((other) => other.port === p.port)) p.port++;
    signal?.throwIfAborted();
    await runtime.save(p);
    return { ids: [p.id], files: files.length };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
