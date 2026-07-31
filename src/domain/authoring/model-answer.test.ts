import { describe, expect, it } from "vitest";
import {
  fragmentFromAnswer,
  jsonFromAnswer,
  plainFromAnswer,
} from "./model-answer";

/**
 * What models get wrong on the way out, and what this codebase does about it.
 *
 * None of it is a formatting nicety: an answer wrapped in a fence, a bare block
 * instead of a document, or `**bold**` left as literal text is the difference
 * between a document appearing in the editor and a retry the user waits for.
 */
describe("jsonFromAnswer", () => {
  it("reads a plain JSON answer", () => {
    expect(jsonFromAnswer('{"type":"doc","content":[]}')).toEqual({
      type: "doc",
      content: [],
    });
  });

  it("reads through a fence, labelled or not", () => {
    expect(jsonFromAnswer('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonFromAnswer("```\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("reads through the prose a model puts around it", () => {
    expect(jsonFromAnswer('Here is your document:\n{"a":1}\nHope this helps!')).toEqual({
      a: 1,
    });
  });

  it("reads an array answer, which the op contract asks for", () => {
    expect(jsonFromAnswer('[{"op":"delete","index":0}]')).toEqual([
      { op: "delete", index: 0 },
    ]);
  });

  it("says so when there is no JSON at all, so the retry can quote it", () => {
    expect(() => jsonFromAnswer("I cannot do that.")).toThrow(/No JSON/);
    expect(() => jsonFromAnswer("{ unbalanced")).toThrow();
  });

  it("repairs the trailing comma models leave behind", () => {
    expect(jsonFromAnswer('{"type":"doc","content":[],}')).toEqual({
      type: "doc",
      content: [],
    });
    expect(jsonFromAnswer('{"content":[{"type":"paragraph"},]}')).toEqual({
      content: [{ type: "paragraph" }],
    });
    expect(jsonFromAnswer('{\n "a": 1,\n "b": [1, 2,],\n}')).toEqual({ a: 1, b: [1, 2] });
  });

  it("leaves a comma that is part of the text alone", () => {
    expect(jsonFromAnswer('{"text":"one, two,","n":1}')).toEqual({
      text: "one, two,",
      n: 1,
    });
    expect(jsonFromAnswer('{"text":"a \\", }","n":1}')).toEqual({ text: 'a ", }', n: 1 });
  });

  it("still refuses what no repair can fix", () => {
    expect(() => jsonFromAnswer("{'a': 1}")).toThrow();
  });
});

describe("fragmentFromAnswer", () => {
  it("drops the fence and the quotes a model wraps a rewrite in", () => {
    expect(fragmentFromAnswer('```\n"Chiffre d\'affaires"\n```')).toBe(
      "Chiffre d'affaires",
    );
  });

  it("drops emphasis markers, which would show as characters mid-sentence", () => {
    expect(fragmentFromAnswer("**grew** sharply")).toBe("grew sharply");
  });

  it("leaves a clean fragment alone", () => {
    expect(fragmentFromAnswer("chiffre d'affaires")).toBe("chiffre d'affaires");
  });
});

describe("plainFromAnswer", () => {
  it("unwraps an answer a model fenced despite being told not to", () => {
    expect(plainFromAnswer("```\nHello there\n```")).toBe("Hello there");
    expect(plainFromAnswer("```markdown\nHello there\n```")).toBe("Hello there");
  });

  it("keeps a fence the answer legitimately contains", () => {
    const ticket = "Steps:\n```\nnpm run build\n```\nEnd";
    expect(plainFromAnswer(ticket)).toBe(ticket);
  });

  it("leaves an unfenced answer as it is", () => {
    expect(plainFromAnswer("Hello there")).toBe("Hello there");
  });
});
