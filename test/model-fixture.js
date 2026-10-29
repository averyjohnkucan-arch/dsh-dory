import { writeFile } from "node:fs/promises";
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};
const u64 = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const string = (value) =>
  Buffer.concat([u64(Buffer.byteLength(value)), Buffer.from(value)]);
export async function gguf(
  path,
  { architecture = "dory", index = 0, count = 1, context = 262144 } = {},
) {
  const values = [
    ["general.architecture", 8, architecture],
    ["dory.context_length", 4, context],
    ["split.no", 4, index],
    ["split.count", 4, count],
  ];
  const metadata = values.map(([key, type, value]) =>
    Buffer.concat([
      string(key),
      u32(type),
      type === 8 ? string(value) : u32(value),
    ]),
  );
  await writeFile(
    path,
    Buffer.concat([
      Buffer.from("GGUF"),
      u32(3),
      u64(0),
      u64(values.length),
      ...metadata,
    ]),
  );
}
