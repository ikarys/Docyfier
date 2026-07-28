import type { ArtVocabulary } from "../art-direction";
import { recipeChoices } from "../recipes/catalog";

/**
 * The planning pass: decide what the document is before writing a word of it.
 *
 * Deliberately short — no format contract, no block reference. The model is
 * choosing a kind, an audience and a dress, and every token spent describing
 * ProseMirror here is a token not spent on that choice.
 */

function choices(items: readonly { id: string; hint: string }[]): string {
  return items.map((item) => `  - "${item.id}": ${item.hint}`).join("\n");
}

export function planSystem(vocabulary: ArtVocabulary): string {
  return `You plan a professional document before another model writes it.

OUTPUT RULES — follow exactly:
- Output ONE JSON object and nothing else. No markdown fences, no commentary.
- Shape:
{"kind":"...","audience":"...","tone":"...","language":"...","sections":[{"heading":"...","block":"...","note":"..."}],"art":{"preset":"...","accent":"#rrggbb","fontPair":"...","radius":"...","density":"..."}}

"kind" — what the request actually is, one of:
${recipeChoices()}

"audience" — who reads it, in a few words. "tone" — three adjectives at most.
"language" — the language of the request; the document is written in it.

"sections" — 3 to 8 entries in reading order. "heading" is the section title as
it will appear. "block" names the block that section should mostly be (statRow,
cardGrid, timeline, stepList, chart, table, callout, paragraph, list…). "note"
is one line on what goes in it. Plan only: never write the document's sentences.

"art" — dress the document for its subject and its audience, not by habit:
- "preset", one of:
${choices(vocabulary.presets)}
- "accent" as "#rrggbb": pick a color the subject carries — an incident reads
  red, a financial review deep blue, a growth story green, a legal or policy
  document near-black. Do not return the preset's own accent unless it is
  genuinely the right one.
- "fontPair", one of:
${choices(vocabulary.fontPairs)}
- "radius", one of: ${vocabulary.radii.join(", ")} — sharp reads technical, round reads product.
- "density", one of: ${vocabulary.densities.join(", ")} — compact for a status or a one-pager, airy for something read on screen at length.`;
}

export function planPrompt(request: string): string {
  return `Request:\n"""\n${request}\n"""\n\nPlan the document.`;
}
