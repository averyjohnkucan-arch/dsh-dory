import { readdir, stat } from "node:fs/promises";
import { dirname, join, resolve, parse } from "node:path";
import { inspectGguf } from "./gguf.js";

export async function inspectModel(path, signal) {
  const file = await inspectGguf(path, signal);
  if (file.architecture !== "dory")
    throw Error(
      "This GGUF is " +
        (file.architecture || "unknown") +
        "; choose a Dory model.",
    );
  return file;
}

/** Follow directory links once, identify shards by metadata, and keep invalid files visible. */
export async function scanModels(root, { signal, report = () => {} } = {}) {
  root = resolve(root);
  if (parse(root).root === root)
    throw Error("Choose a model folder rather than the entire filesystem.");
  const pending = [root],
    seen = new Set(),
    files = [],
    warnings = [];
  while (pending.length) {
    signal?.throwIfAborted();
    const directory = pending.pop();
    let info, entries;
    try {
      info = await stat(directory);
      const key = info.dev + ":" + info.ino;
      if (seen.has(key)) continue;
      seen.add(key);
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (!["EACCES", "ENOENT", "EPERM", "ELOOP"].includes(error.code))
        throw error;
      warnings.push(directory + ": " + error.code);
      continue;
    }
    for (const entry of entries) {
      signal?.throwIfAborted();
      const path = join(directory, entry.name);
      try {
        const info = entry.isSymbolicLink() ? await stat(path) : null;
        if (entry.isDirectory() || info?.isDirectory()) pending.push(path);
        else if (
          (entry.isFile() || info?.isFile()) &&
          /\.gguf$/i.test(entry.name)
        ) {
          report("Inspecting " + entry.name);
          try {
            files.push(await inspectModel(path, signal));
          } catch (error) {
            signal?.throwIfAborted();
            warnings.push(entry.name + ": " + error.message);
          }
        }
      } catch (error) {
        if (!["EACCES", "ENOENT", "EPERM", "ELOOP"].includes(error.code))
          throw error;
        warnings.push(path + ": " + error.code);
      }
    }
  }
  return { root, models: groupModels(files), warnings };
}

export function groupModels(files) {
  const groups = new Map();
  for (const file of files) {
    // Different quantizations in separate directories must never share shards.
    const key = join(dirname(file.path), file.group);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }
  return [...groups.values()]
    .map((parts) => {
      parts.sort((a, b) => a.index - b.index);
      const first = parts[0],
        count = first.count;
      const missing = Array.from({ length: count }, (_, i) => i + 1).filter(
        (i) => !parts.some((p) => p.index === i),
      );
      const inconsistent =
        parts.some((p) => p.count !== count) ||
        new Set(parts.map((p) => p.index)).size !== parts.length;
      return {
        name: first.group,
        path: parts.find((p) => p.index === 1)?.path || first.path,
        nativeContext: first.metadata["dory.context_length"] || 262144,
        files: parts,
        missing,
        complete: !missing.length && !inconsistent,
        components: {
          decoder: "Looped Dory decoder",
          mtp: "Not supported by this Dory engine",
          vision: "Text only",
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function modelParts(path, signal) {
  const first = await inspectModel(path, signal);
  if (first.count === 1) return [first];
  const files = [];
  for (const entry of await readdir(dirname(path))) {
    if (!/\.gguf$/i.test(entry)) continue;
    // Restrict inspection to the selected shard basename; unrelated models stay untouched.
    if (!entry.startsWith(first.group + "-")) continue;
    const file = await inspectModel(join(dirname(path), entry), signal);
    if (file.group === first.group) files.push(file);
  }
  const group = groupModels(files)[0];
  if (!group?.complete)
    throw Error(
      "Missing or inconsistent Dory shards: " +
        (group?.missing.join(", ") || "unknown"),
    );
  return group.files;
}
