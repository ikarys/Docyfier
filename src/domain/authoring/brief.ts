import { readArtDirection, type ArtDirection, type ArtVocabulary } from "./art-direction";
import { DEFAULT_RECIPE, findRecipe } from "./recipes/catalog";

/**
 * What the planning pass decides before a single word is written: what kind of
 * document this is, who reads it, in which tone and language, what its sections
 * are, and how it should be dressed.
 *
 * Reading a brief never throws. A plan is an aid, not a contract: a model that
 * answers nonsense costs the document its plan, never the document itself, so
 * every field falls back on its own and the writer runs with what survived.
 */

export interface SectionPlan {
  heading: string;
  /** The block the section is meant to be — quoted to the writer, not enforced:
   * the format contract and the schema are what actually gate node types. */
  block?: string;
  note?: string;
}

export interface DocumentBrief {
  /** A recipe kind; always one the catalog knows. */
  kind: string;
  audience: string;
  tone: string;
  language: string;
  sections: SectionPlan[];
  art: ArtDirection | null;
}

/** A plan long enough to shape a document, short enough to stay a plan. */
const MAX_SECTIONS = 12;
const MAX_LINE = 160;

export function defaultBrief(): DocumentBrief {
  return {
    kind: DEFAULT_RECIPE.kind,
    audience: "",
    tone: "",
    language: "",
    sections: [],
    art: null,
  };
}

function line(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_LINE) : "";
}

function readSection(value: unknown): SectionPlan | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const heading = line(raw.heading);
  if (!heading) return null;

  const section: SectionPlan = { heading };
  const block = line(raw.block);
  const note = line(raw.note);
  if (block) section.block = block;
  if (note) section.note = note;
  return section;
}

function readSections(value: unknown): SectionPlan[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(readSection)
    .filter((section): section is SectionPlan => section !== null)
    .slice(0, MAX_SECTIONS);
}

export function readBrief(json: unknown, vocabulary: ArtVocabulary): DocumentBrief {
  if (typeof json !== "object" || json === null) return defaultBrief();
  const raw = json as Record<string, unknown>;
  return {
    kind: findRecipe(raw.kind)?.kind ?? DEFAULT_RECIPE.kind,
    audience: line(raw.audience),
    tone: line(raw.tone),
    language: line(raw.language),
    sections: readSections(raw.sections),
    art: readArtDirection(raw.art, vocabulary),
  };
}
