import { describe, expect, it } from "vitest";
import type { DocumentSummary } from "@/domain/documents/repository";
import { matchingDocuments } from "./matching";

const docs: DocumentSummary[] = [
  { id: "1", title: "Quarterly report", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "2", title: "Rapport annuel", updatedAt: "2026-01-02T00:00:00.000Z" },
  { id: "3", title: "Untitled document", updatedAt: "2026-01-03T00:00:00.000Z" },
];

const titlesFor = (query: string) => matchingDocuments(docs, query).map((d) => d.title);

describe("searching the document list", () => {
  it("shows everything until something is typed", () => {
    expect(matchingDocuments(docs, "")).toBe(docs);
    expect(matchingDocuments(docs, "   ")).toBe(docs);
  });

  it("matches anywhere in the title, whatever the case", () => {
    expect(titlesFor("REPORT")).toEqual(["Quarterly report"]);
    expect(titlesFor("rapp")).toEqual(["Rapport annuel"]);
  });

  it("ignores the spaces around what was typed", () => {
    expect(titlesFor("  annuel ")).toEqual(["Rapport annuel"]);
  });

  it("answers nothing when nothing matches", () => {
    expect(matchingDocuments(docs, "invoice")).toEqual([]);
  });
});
