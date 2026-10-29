/** Preserve named tool selection on the pinned native string-only API. */
export function nativeToolChoice(body) {
  const choice = body.tool_choice;
  if (choice === undefined || choice === null || typeof choice === "string")
    return body;
  if (
    choice.type !== "function" ||
    typeof choice.function?.name !== "string" ||
    !choice.function.name
  ) {
    throw new Error("Unsupported named tool choice.");
  }
  const tools = (body.tools || []).filter(
    (tool) =>
      tool.type === "function" && tool.function?.name === choice.function.name,
  );
  if (tools.length !== 1)
    throw new Error(
      "Named tool choice must match exactly one declared function.",
    );
  // With one selected tool, required is equivalent to the requested named
  // choice. Leave its argument schema unchanged; never supply argument values.
  return { ...body, tools, tool_choice: "required" };
}
