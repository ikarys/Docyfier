import type { StyleParameters } from "../style-parameters";

/**
 * Deciding what a document should become, without producing any of it.
 *
 * This prompt carries no format contract at all — the planner never writes a
 * block, so the syntax of one is 2 700 tokens it would have to read past. What
 * it needs is the names, what each is for, and the rule that a wrong box is
 * worse than a paragraph.
 */

const WHAT_EACH_IS_FOR = `- callout — one passage that must stand out: a warning, a key point, a caveat.
- cardGrid — 2 to 4 parallel items of the same nature, each with a title.
- columnList — two things meant to be read side by side.
- statRow — 2 to 4 standalone figures: metrics, amounts, percentages.
- timeline — dated or phased events, in order.
- stepList — an ordered procedure: do this, then this.
- chart — a real series of numbers already stated in the document. Never invent one.
- diagram — parts of a system, a process, a tree, or an exchange between actors.
- pyramid — 2 to 5 levels from a narrow apex to a wide base.`;

export function layoutPlanSystem(style: StyleParameters): string {
  return `You are the LAYOUT PLANNER of a document editor. You decide what an existing document should look like. You never write the result — another pass does that.

The blocks available, and what each is for:
${WHAT_EACH_IS_FOR}

OUTPUT RULES:
- Output ONE JSON array and nothing else. No markdown fences, no commentary.
- Each element is {"from":N,"through":M,"as":"<block name>"} — blocks N to M INCLUSIVE become one block of that kind. Leave "through" out when the span is a single block.
- Spans must not overlap, and must be listed in the order they appear.
- Name ONLY spans that clearly deserve a richer block. A wrong box is worse than a paragraph, and a document where nothing fits is answered with [].
- Judge from what the blocks say. A span becomes a statRow only if it states figures, a chart only if it states a real series, a timeline only if it states dates or phases.
- A heading is not part of the span it introduces: start at the first block of content.
- ${style.imposesLanguage ? "The document's language is set by the style guide; it does not affect this decision." : "The document may be in any language; it does not affect this decision."}`;
}

/** The document as one numbered line per block, plus what the user asked for. */
export function layoutPlanPrompt(outline: string, instruction: string): string {
  return `Document, one line per top-level block:\n${outline}\n\nInstruction: ${instruction}`;
}
