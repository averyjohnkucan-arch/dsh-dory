import test from "node:test";
import assert from "node:assert/strict";
import { nativeToolChoice } from "../lib/tool-choice.js";

const selected = {
  type: "function",
  function: {
    name: "record_value",
    parameters: { type: "object", properties: { value: { type: "integer" } } },
  },
};
const other = {
  type: "function",
  function: { name: "other", parameters: { type: "object" } },
};

test("named function remains required without constraining its answer or mutating input", () => {
  const input = Object.freeze({
    tools: Object.freeze([other, selected]),
    tool_choice: { type: "function", function: { name: "record_value" } },
    messages: [],
    temperature: 1,
  });
  const output = nativeToolChoice(input);
  assert.equal(output.tool_choice, "required");
  assert.deepEqual(output.tools, [selected]);
  assert.equal(output.tools[0], selected);
  assert.equal(input.tools.length, 2);
  assert.equal(typeof input.tool_choice, "object");
  assert.equal(output.temperature, 1);
});

test("auto, required, none and omitted choices retain their semantics", () => {
  for (const choice of [undefined, null, "auto", "required", "none"]) {
    const input = { tools: [selected, other], tool_choice: choice };
    assert.equal(nativeToolChoice(input), input);
  }
});

test("unknown, malformed and ambiguous choices never fall back to auto", () => {
  assert.throws(
    () =>
      nativeToolChoice({
        tools: [selected],
        tool_choice: { type: "function", function: { name: "missing" } },
      }),
    /exactly one/,
  );
  assert.throws(
    () =>
      nativeToolChoice({
        tools: [selected, selected],
        tool_choice: { type: "function", function: { name: "record_value" } },
      }),
    /exactly one/,
  );
  assert.throws(
    () => nativeToolChoice({ tool_choice: { type: "unknown" } }),
    /Unsupported/,
  );
});
