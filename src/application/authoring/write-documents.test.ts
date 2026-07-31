import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import { defaultBrief } from "@/domain/authoring/brief";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import { generateDocument, transformDocument } from "./write-documents";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const doc = (...blocks: object[]) => ({ type: "doc", content: blocks });

/** A document the model wrote, in the format it now answers in. */
const written = (...lines: string[]) => lines.join("\n\n");

/** An op list, whose envelope is still JSON and whose blocks are not. */
const ops = (value: object) => JSON.stringify(value);

describe("generateDocument", () => {
  it("hands back the document the model wrote", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);

    expect(await generateDocument(authoringDeps(generator), "Write a note", defaultBrief())).toEqual(
      doc(paragraph("Bonjour")),
    );
  });

  it("writes against the shape of the kind the plan chose", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);

    await generateDocument(authoringDeps(generator), "Write up yesterday's outage", {
      ...defaultBrief(),
      kind: "postmortem",
      audience: "the on-call team",
      sections: [{ heading: "Impact", block: "callout" }],
    });

    const { system } = generator.requests[0];
    expect(system).toContain("Root cause");
    expect(system).toContain("the on-call team");
    expect(system).toContain("1. Impact — as a callout");
  });

  it("carries the instance's style parameters into the prompt", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);
    const style = StyleParameters.restore({ emoji: true, autoBold: true });

    await generateDocument(
      authoringDeps(generator, { style }),
      "Write a note",
      defaultBrief(),
    );

    const { system } = generator.requests[0];
    expect(system).toContain("Emoji are welcome");
    expect(system).toContain("Bold the two or three");
  });

  it("lets an imposed language win over the one the plan picked", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);
    const style = StyleParameters.restore({ language: "French" });

    await generateDocument(authoringDeps(generator, { style }), "Write a note", {
      ...defaultBrief(),
      language: "English",
    });

    const { system } = generator.requests[0];
    expect(system).toContain("Write the document in French");
    expect(system).not.toContain("Language: English");
  });

  it("writes against the default shape when the plan named no kind it knows", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);

    await generateDocument(authoringDeps(generator), "Write a note", {
      ...defaultBrief(),
      kind: "haiku",
    });

    expect(generator.requests[0].system).toContain("SHORT NOTE");
  });

  it("reads an answer the model fenced anyway", async () => {
    const generator = new ScriptedGenerator(["```markdown\nBonjour\n```"]);

    expect(await generateDocument(authoringDeps(generator), "Write a note", defaultBrief())).toEqual(
      doc(paragraph("Bonjour")),
    );
  });

  /** An answer saying nothing is as retryable as one the schema rejects: a
   * model that refused in prose usually writes the document when told so. */
  it("re-asks once, quoting why the first answer was rejected", async () => {
    const generator = new ScriptedGenerator(["", written("Second try")]);

    const body = await generateDocument(authoringDeps(generator), "Write a note", defaultBrief());

    expect(body).toEqual(doc(paragraph("Second try")));
    expect(generator.requests[1].prompt).toContain("rejected");
    expect(generator.requests[1].prompt).toContain("no blocks");
  });

  it("gives up after one retry rather than making the user wait again", async () => {
    const generator = new ScriptedGenerator(["", ""]);

    await expect(
      generateDocument(authoringDeps(generator), "Write a note", defaultBrief()),
    ).rejects.toThrow(/invalid answer/);
    expect(generator.requests).toHaveLength(2);
  });

  it("never puts the schema's own words in front of the user", async () => {
    const generator = new ScriptedGenerator([written("Un"), written("Deux")]);
    const deps = authoringDeps(generator, {
      validator: {
        validate: () => {
          throw new Error("Invalid content for node doc at position 1021");
        },
      },
    });

    await expect(
      generateDocument(deps, "Write a note", defaultBrief()),
    ).rejects.toThrow(/invalid answer/);
  });

  /**
   * What it says matters as much as that it refuses. Blaming the document sent
   * the maintainer to shrink one that was fine, then to raise a budget the
   * model was spending on reasoning rather than on writing. The message names
   * what happened — the answer stopped at the ceiling — and what to try.
   */
  it("refuses an answer cut short instead of retrying it", async () => {
    const generator = new ScriptedGenerator([{ text: "{", truncated: true }]);

    await expect(
      generateDocument(authoringDeps(generator), "Write a note", defaultBrief()),
    ).rejects.toThrow(/cut off/);
    expect(generator.requests).toHaveLength(1);
  });

  it("does not blame the document for an answer that never finished", async () => {
    const generator = new ScriptedGenerator([{ text: "{", truncated: true }]);

    await expect(
      generateDocument(authoringDeps(generator), "Write a note", defaultBrief()),
    ).rejects.not.toThrow(/document is too large/);
  });

  it("keeps the model's own output when the formatting pass misfires", async () => {
    const generator = new ScriptedGenerator([written("Bonjour")]);
    const deps = authoringDeps(generator, {
      polisher: { polish: () => ({ type: "not-a-doc" }) },
    });

    expect(await generateDocument(deps, "Write a note", defaultBrief())).toEqual(doc(paragraph("Bonjour")));
  });

});

describe("transformDocument", () => {
  const body = doc(paragraph("One"), paragraph("Two"));

  it("returns the edits the model named, and nothing else", async () => {
    const generator = new ScriptedGenerator([
      ops([{ op: "replace", index: 1, blocks: "Deux" }]),
    ]);

    const outcome = await transformDocument(
      authoringDeps(generator),
      body,
      "translate the second block",
    );

    expect(outcome).toEqual({
      kind: "ops",
      ops: [{ op: "replace", index: 1, through: 1, blocks: [paragraph("Deux")] }],
    });
  });

  it("addresses blocks by the numbering the model was given", async () => {
    const generator = new ScriptedGenerator([ops([])]);

    await transformDocument(authoringDeps(generator), body, "make it pretty");

    expect(generator.requests[0].prompt).toContain("[0]\nOne");
    expect(generator.requests[0].prompt).toContain("[1]\nTwo");
  });

  it("falls back to a replacement when the model rewrites the whole document", async () => {
    const generator = new ScriptedGenerator([written("Rewritten")]);

    expect(
      await transformDocument(authoringDeps(generator), body, "make it pretty"),
    ).toEqual({ kind: "doc", content: doc(paragraph("Rewritten")) });
  });

  it("carries an op with no block left after formatting rather than an undefined one", async () => {
    const generator = new ScriptedGenerator([
      ops([{ op: "replace", index: 0, blocks: "One" }]),
    ]);
    const deps = authoringDeps(generator, {
      validator: { validate: (json) => json as { type: string } },
      polisher: { polish: () => ({ type: "doc" }) },
    });

    expect(await transformDocument(deps, body, "strip it")).toEqual({
      kind: "ops",
      ops: [{ op: "replace", index: 0, through: 0, blocks: [] }],
    });
  });

  it("rejects the whole answer when one op is malformed, never applying part of it", async () => {
    const generator = new ScriptedGenerator([
      ops([{ op: "replace", index: 99, blocks: "Nope" }]),
      ops([{ op: "delete", index: 0 }]),
    ]);

    const outcome = await transformDocument(
      authoringDeps(generator),
      body,
      "drop the first block",
    );

    expect(outcome).toEqual({ kind: "ops", ops: [{ op: "delete", index: 0 }] });
  });
});
