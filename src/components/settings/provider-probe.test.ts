import { describe, expect, it } from "vitest";
import { afterChat, afterModelList, missingModelId } from "./provider-probe";

describe("asking a server for its models", () => {
  it("reports what it offers", () => {
    const plan = afterModelList({ ok: true, models: [{ id: "a" }, { id: "b" }] }, "");
    expect(plan).toEqual({ probe: { state: "ok", models: ["a", "b"] } });
  });

  it("passes an ordinary failure straight through, status included", () => {
    const plan = afterModelList({ ok: false, error: "refused", status: 401 }, "");
    expect(plan).toEqual({
      probe: { state: "error", message: "refused", status: 401 },
    });
  });
});

describe("a server with no model list", () => {
  const noEndpoint = { ok: false as const, error: "404 on /models", status: 404 };

  it("proves a pinned model id by chatting instead of showing the 404", () => {
    expect(afterModelList(noEndpoint, "gpt-4o")).toEqual({
      manual: true,
      retryAsChat: true,
    });
  });

  it("asks for a model id when none is pinned, and switches to typing one", () => {
    expect(afterModelList(noEndpoint, "  ")).toEqual({
      manual: true,
      probe: { state: "error", message: "404 on /models", status: 404 },
    });
  });
});

describe("proving a pinned model by chatting", () => {
  it("counts a reply as the model being reachable", () => {
    expect(afterChat({ ok: true }, "gpt-4o")).toEqual({
      state: "ok",
      models: ["gpt-4o"],
      via: "chat",
    });
  });

  it("reports why the chat failed", () => {
    expect(afterChat({ ok: false, error: "bad key" }, "gpt-4o")).toEqual({
      state: "error",
      message: "bad key",
    });
  });

  it("refuses to test a model id that was never entered", () => {
    expect(missingModelId("   ")).toEqual({
      state: "error",
      message: "Enter a model id to test.",
    });
    expect(missingModelId("gpt-4o")).toBeNull();
  });
});
