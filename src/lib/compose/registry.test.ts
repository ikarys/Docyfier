import { describe, expect, it } from "vitest";
import { COMPOSERS, composerInfos, findComposer } from "./registry";
import { clipboardFormat, fieldValue, type Composer, type ComposerValues } from "./types";

/** A form the user actually filled in: every free-text field carries something. */
function filledValues(composer: Composer): ComposerValues {
  return Object.fromEntries(
    composer.fields.map((field) => [
      field.id,
      field.type === "select" ? fieldValue(field, {}) : `valeur de ${field.id}`,
    ]),
  );
}

/**
 * The registry is the contract every composer signs. A composer that breaks
 * one of these rules renders a broken form or writes into a field that is not
 * there — neither fails at build time.
 */
describe("COMPOSERS", () => {
  it("ships at least the email and ticket flows", () => {
    expect(COMPOSERS.map((c) => c.id)).toEqual(
      expect.arrayContaining(["email", "ticket"]),
    );
  });

  it("has no duplicate id", () => {
    const ids = COMPOSERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s writes its answer back into one of its own textareas",
    (_id, composer) => {
      const output = composer.fields.find((f) => f.id === composer.outputField);
      expect(output).toBeDefined();
      expect(output?.type).toBe("textarea");
    },
  );

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s declares no duplicate field id",
    (_id, composer) => {
      const ids = composer.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s gives every select a set of choices holding its default",
    (_id, composer) => {
      for (const field of composer.fields.filter((f) => f.type === "select")) {
        expect(field.choices?.length).toBeGreaterThan(0);
        expect(field.choices?.some((choice) => choice.value === field.default)).toBe(true);
      }
    },
  );

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s resolves a clipboard format for its own defaults",
    (_id, composer) => {
      const values = Object.fromEntries(
        composer.fields.map((field) => [field.id, fieldValue(field, {})]),
      );
      expect(["html", "markdown", "jira", "text"]).toContain(
        clipboardFormat(composer.clipboard, values),
      );
    },
  );

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s builds a prompt from a filled form without throwing",
    (_id, composer) => {
      const prompt = composer.build(filledValues(composer), {
        revising: false,
        guidance: "",
      });

      expect(prompt.system.trim()).not.toBe("");
      expect(prompt.prompt.trim()).not.toBe("");
    },
  );

  /**
   * An empty form yields an empty prompt body on purpose: the action refuses
   * the run through `missingRequiredField` long before `build` is reached.
   */
  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s still describes the task when the form is empty",
    (_id, composer) => {
      const values = Object.fromEntries(
        composer.fields.map((field) => [field.id, fieldValue(field, {})]),
      );
      const prompt = composer.build(values, { revising: false, guidance: "" });

      expect(prompt.system.trim()).not.toBe("");
    },
  );

  it.each(COMPOSERS.map((c) => [c.id, c] as const))(
    "%s carries the user's guidance into the prompt it builds",
    (_id, composer) => {
      const prompt = composer.build(filledValues(composer), {
        revising: true,
        guidance: "UNMISTAKABLE-GUIDANCE",
      });

      expect(`${prompt.system}\n${prompt.prompt}`).toContain("UNMISTAKABLE-GUIDANCE");
    },
  );
});

describe("findComposer", () => {
  it("finds a composer by id", () => {
    expect(findComposer("email")?.id).toBe("email");
  });

  it("returns undefined for an unknown id, so the page can 404", () => {
    expect(findComposer("nope")).toBeUndefined();
  });
});

describe("composerInfos", () => {
  it("hands the client one info per composer, none carrying build", () => {
    const infos = composerInfos();
    expect(infos).toHaveLength(COMPOSERS.length);
    for (const info of infos) expect(info).not.toHaveProperty("build");
  });
});
