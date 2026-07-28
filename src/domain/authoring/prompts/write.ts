import type { DocumentBrief } from "../brief";
import type { DocumentRecipe } from "../recipes/contract";
import { FORMAT_CONTRACT } from "./format-contract";
import { STYLE_GUIDE } from "./style-guide";

/**
 * Surface 1 — writing a document from a request.
 *
 * The writer receives a shape to fill (the recipe) and a plan for this one
 * document (the brief), on top of the shared contract and style guide. What it
 * no longer receives is a bare catalogue of blocks with no indication of what
 * the document it is about to write actually is.
 */

function sectionLines(brief: DocumentBrief): string {
  return brief.sections
    .map((section, i) => {
      const block = section.block ? ` — as a ${section.block}` : "";
      const note = section.note ? ` (${section.note})` : "";
      return `${i + 1}. ${section.heading}${block}${note}`;
    })
    .join("\n");
}

function planLines(brief: DocumentBrief): string {
  const lines = [
    brief.audience ? `Audience: ${brief.audience}` : "",
    brief.tone ? `Tone: ${brief.tone}` : "",
    brief.language ? `Language: ${brief.language}` : "",
    brief.sections.length ? `Sections, in order:\n${sectionLines(brief)}` : "",
  ].filter(Boolean);
  return lines.length ? `\n\nPlan for this document:\n${lines.join("\n")}` : "";
}

export function writerSystem(recipe: DocumentRecipe, brief: DocumentBrief): string {
  return `${FORMAT_CONTRACT}

${STYLE_GUIDE}

This document is a ${recipe.label.toUpperCase()}. Its shape, in order:
${recipe.skeleton}${planLines(brief)}

Task: write that document in full. Follow the shape — it is what makes this kind of document recognizable — and depart from it only where the subject leaves a block with nothing real to put in it. An empty section is worse than a missing one.`;
}
