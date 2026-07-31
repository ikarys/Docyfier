/**
 * The format a model reads and writes (PLAN.md STEP U14).
 *
 * ProseMirror JSON costs ×4.4 the visible text in both directions, and it is
 * the only tax left on an AI call that shortens the wait itself. Markdown for
 * what markdown already covers, `::: name {attrs}` for what it does not — a
 * convention models have read millions of times, never a private syntax.
 *
 * This is not `../markdown`, which renders a document for a human to read and
 * drops what a reader would not miss. Here nothing may be dropped: the two
 * functions below are inverses, and `round-trip.test.ts` says so for every node
 * type and every mark the editor ships.
 *
 * The document on disk is unaffected — it stays ProseMirror JSON, which is the
 * editor's own shape and was never the cost.
 */

export { blocksToModelMarkdown } from "./emit";
export { modelMarkdownToBlocks } from "./parse";
