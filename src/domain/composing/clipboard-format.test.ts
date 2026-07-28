import { describe, expect, it } from "vitest";
import { clipboardFormat, type ComposeClipboard } from "./clipboard-format";

const byTool: ComposeClipboard = {
  default: "markdown",
  field: "tool",
  by: { gitlab: "markdown", jira: "jira" },
};

describe("clipboardFormat", () => {
  it("uses the format the deciding field selects", () => {
    expect(clipboardFormat(byTool, { tool: "jira" })).toBe("jira");
    expect(clipboardFormat(byTool, { tool: "gitlab" })).toBe("markdown");
  });

  it("falls back to the default when the field says nothing it knows", () => {
    expect(clipboardFormat(byTool, { tool: "asana" })).toBe("markdown");
    expect(clipboardFormat(byTool, {})).toBe("markdown");
  });

  it("uses the default when no field decides at all", () => {
    expect(clipboardFormat({ default: "html" }, { tool: "jira" })).toBe("html");
  });
});
