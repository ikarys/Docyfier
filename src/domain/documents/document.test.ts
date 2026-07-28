import { describe, expect, it } from "vitest";
import { Document, type DocumentRecord } from "./document";
import { emptyBody } from "./body";
import { UNTITLED } from "./title";
import { DEFAULT_PRESET } from "./theme";

const text = (value: string) => ({ type: "text", text: value });
const heading = (value: string) => ({
  type: "heading",
  attrs: { level: 1 },
  content: [text(value)],
});
const doc = (...content: object[]) => ({ type: "doc", content });

const T0 = "2026-01-01T10:00:00.000Z";
const T1 = "2026-01-02T11:00:00.000Z";

const created = (body?: unknown, theme?: unknown) =>
  Document.create({ id: "doc-1", now: T0, body, theme });

describe("Document.create", () => {
  it("starts on an empty body when none is given", () => {
    expect(created().body).toEqual(emptyBody());
    expect(created().title).toBe(UNTITLED);
  });

  it("starts on the default preset when no theme is given", () => {
    expect(created().theme).toEqual({ preset: DEFAULT_PRESET });
  });

  it("keeps the theme it is given, repaired", () => {
    expect(created(undefined, "corporate").theme).toEqual({ preset: "corporate" });
    expect(created(undefined, { preset: 42 }).theme).toEqual({
      preset: DEFAULT_PRESET,
    });
  });

  it("is created and updated at the same instant", () => {
    expect(created().createdAt).toBe(T0);
    expect(created().updatedAt).toBe(T0);
  });

  it("starts with a title that follows the content", () => {
    const document = created(doc(heading("Rapport")));
    expect(document.title).toBe("Rapport");
    expect(document.titleFollowsContent).toBe(true);
  });
});

describe("Document.restore", () => {
  const record: DocumentRecord = {
    id: "doc-1",
    title: "stale",
    content: doc(heading("Rapport")),
    theme: { preset: "corporate" },
    createdAt: T0,
    updatedAt: T0,
  };

  it("recomputes the title rather than trusting the stored one", () => {
    expect(Document.restore(record).title).toBe("Rapport");
  });

  it("honours a stored rename", () => {
    const renamed = { ...record, titleOverride: "Nom choisi" };
    expect(Document.restore(renamed).title).toBe("Nom choisi");
    expect(Document.restore(renamed).titleFollowsContent).toBe(false);
  });

  it("ignores a blank override, which would otherwise freeze a blank name", () => {
    const blank = { ...record, titleOverride: "   " };
    expect(Document.restore(blank).title).toBe("Rapport");
  });

  it("repairs a theme written before the tokens existed", () => {
    const legacy = { ...record, theme: "minimal" as unknown as DocumentRecord["theme"] };
    expect(Document.restore(legacy).theme).toEqual({ preset: "minimal" });
  });

  it("repairs a body a driver could not return", () => {
    const broken = { ...record, content: null as unknown as DocumentRecord["content"] };
    expect(Document.restore(broken).body).toEqual(emptyBody());
  });

  it("round-trips through a record", () => {
    const restored = Document.restore(record);
    expect(Document.restore(restored.toRecord()).toRecord()).toEqual(restored.toRecord());
  });
});

describe("editing", () => {
  it("moves the update time and leaves the creation time alone", () => {
    const edited = created().withBody(doc(heading("Titre")), T1);
    expect(edited.updatedAt).toBe(T1);
    expect(edited.createdAt).toBe(T0);
  });

  it("lets the title follow new content", () => {
    expect(created().withBody(doc(heading("Titre")), T1).title).toBe("Titre");
  });

  it("keeps a rename in force when the content changes under it", () => {
    const renamed = created(doc(heading("Un"))).rename("Nom choisi", T1);
    expect(renamed.withBody(doc(heading("Deux")), T1).title).toBe("Nom choisi");
  });

  it("hands the title back to the content when the rename is cleared", () => {
    const renamed = created(doc(heading("Un"))).rename("Nom choisi", T1);
    expect(renamed.rename("", T1).title).toBe("Un");
    expect(renamed.rename("", T1).titleFollowsContent).toBe(true);
  });

  it("changes the theme without touching the content", () => {
    const document = created(doc(heading("Rapport")));
    const themed = document.withTheme({ preset: "vivid" }, T1);
    expect(themed.theme).toEqual({ preset: "vivid" });
    expect(themed.body).toBe(document.body);
  });

  it("never mutates the document it was called on", () => {
    const document = created(doc(heading("Un")));
    document.rename("Deux", T1);
    document.withBody(doc(heading("Trois")), T1);
    document.withTheme({ preset: "vivid" }, T1);

    expect(document.title).toBe("Un");
    expect(document.theme).toEqual({ preset: DEFAULT_PRESET });
    expect(document.updatedAt).toBe(T0);
  });
});

describe("duplicateAs", () => {
  const source = created(doc(heading("Rapport")));
  const copy = source.duplicateAs("doc-2", T1);

  it("takes the new id and the new instant", () => {
    expect(copy.id).toBe("doc-2");
    expect(copy.createdAt).toBe(T1);
    expect(copy.updatedAt).toBe(T1);
  });

  it("names itself after its source, and freezes that name", () => {
    expect(copy.title).toBe("Copy of Rapport");
    expect(copy.titleFollowsContent).toBe(false);
  });

  it("copies the name the source actually shows, not the one its content gives", () => {
    const renamed = source.rename("Nom choisi", T1);
    expect(renamed.duplicateAs("doc-3", T1).title).toBe("Copy of Nom choisi");
  });

  it("keeps the source's theme", () => {
    expect(source.withTheme({ preset: "vivid" }, T1).duplicateAs("doc-4", T1).theme).toEqual(
      { preset: "vivid" },
    );
  });

  it("is independent: editing the copy leaves the source untouched", () => {
    expect(copy.body).not.toBe(source.body);
    expect(copy.body.content?.[0]).not.toBe(source.body.content?.[0]);
  });
});

describe("toRecord", () => {
  it("stores the effective title, so a repository can list without parsing bodies", () => {
    expect(created(doc(heading("Rapport"))).toRecord().title).toBe("Rapport");
  });

  it("carries no override while the title follows the content", () => {
    expect(created().toRecord()).not.toHaveProperty("titleOverride");
  });

  it("carries the override once the document is renamed", () => {
    expect(created().rename("Nom choisi", T1).toRecord().titleOverride).toBe(
      "Nom choisi",
    );
  });

  it("drops the override again when the rename is cleared", () => {
    const renamed = created().rename("Nom choisi", T1);
    expect(renamed.rename("", T1).toRecord()).not.toHaveProperty("titleOverride");
  });
});

describe("toSummary", () => {
  it("is what a list needs and nothing more", () => {
    expect(created(doc(heading("Rapport"))).toSummary()).toEqual({
      id: "doc-1",
      title: "Rapport",
      updatedAt: T0,
    });
  });
});
