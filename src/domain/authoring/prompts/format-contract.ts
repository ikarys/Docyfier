import { ICON_RULE, LAYOUT_BLOCK_NAMES, LAYOUT_BLOCKS } from "./blocks/layout";
import { ALIGNMENT_RULE, INLINE_NODES } from "./blocks/inline";
import { DOCUMENT_BLOCKS } from "./blocks/document";
import { PROSE_BLOCKS } from "./blocks/prose";
import { showsDocumentBlocks, showsLayoutBlocks, type ContractScope } from "./scope";

/**
 * The block vocabulary a surface is given.
 *
 * It describes what the editor can render — nothing about what a good document
 * looks like, which is the style guide's job, and nothing about a particular
 * kind of document, which is a recipe's. Keeping the three apart is what lets
 * the writer prompt carry a skeleton instead of a catalogue.
 *
 * It is assembled per scope rather than shipped whole because it is the largest
 * thing every model call carries, and most calls were being told about blocks
 * they are forbidden to produce. See `scope.ts` for why that is a rule and not
 * only an economy.
 */

const HEADER = `You write documents for a WYSIWYG editor.

OUTPUT RULES — follow exactly:
- Output the document itself and nothing else: no commentary, and never wrap
  the whole answer in a code fence.
- It is markdown, plus \`::: name {attrs}\` blocks for what markdown has no
  syntax of its own for.
- \`{attrs}\` is ONE JSON object on the opening line; leave it out entirely when
  there is nothing to set.
- EVERY \`:::\` block is closed by a line holding just \`:::\`, including the
  ones with no content.
- A blank line separates two blocks.

Blocks:`;

const SHARED_CONSTRAINTS = `- NEVER emit \`::: image\`, \`::: embed\` or \`::: attachment\`. Those exist only
  once the user has uploaded or linked something; anything you write would
  point at a file that does not exist.
- When the user asks for colour, put a \`<span style="color:...">\` (and/or a
  \`<mark>\`) on the relevant words — do not just add symbols.
- THE USER'S EXPLICIT FORMAT REQUEST ALWAYS WINS over the style guide below:
  if they ask for bullet points, produce a bullet list — not cards, not stats,
  not a table. Only choose fancy blocks when the user has not specified a
  format.`;

const NESTING_CONSTRAINT = `- Never nest \`::: cardGrid\`, \`statRow\`, \`columnList\`, \`timeline\`,
  \`stepList\`, \`pyramid\`, \`chart\`, \`diagram\`, \`docCover\`,
  \`tableOfContents\` or \`pageBreak\` inside a card, a column, a stat, a
  callout, a list item, a table cell or each other — those live at the top
  level only.`;

/**
 * What a prose-only assistant is told about the blocks it may not build. It
 * still meets them in the passage it was handed, and dropping one because it
 * was never described would lose content the user wrote.
 */
const PRESERVE_LAYOUT = `The passage may already contain \`::: ${LAYOUT_BLOCK_NAMES}\` blocks. Return any of them EXACTLY as you received them, opening line included. Never create one: presenting content is another assistant's job.`;

function blockList(scope: ContractScope): string {
  const groups = [PROSE_BLOCKS];
  if (showsDocumentBlocks(scope)) groups.unshift(DOCUMENT_BLOCKS);
  if (showsLayoutBlocks(scope)) groups.push(LAYOUT_BLOCKS);
  return groups.join("\n");
}

function extras(scope: ContractScope): string[] {
  return showsLayoutBlocks(scope)
    ? [ICON_RULE, ALIGNMENT_RULE]
    : [PRESERVE_LAYOUT, ALIGNMENT_RULE];
}

function constraints(scope: ContractScope): string {
  const lines = showsLayoutBlocks(scope)
    ? `${SHARED_CONSTRAINTS}\n${NESTING_CONSTRAINT}`
    : SHARED_CONSTRAINTS;
  return `Constraints:\n${lines}`;
}

/** The contract, sized for what this surface is allowed to produce. */
export function formatContract(scope: ContractScope): string {
  return [
    `${HEADER}\n${blockList(scope)}`,
    INLINE_NODES,
    ...extras(scope),
    constraints(scope),
  ].join("\n\n");
}
