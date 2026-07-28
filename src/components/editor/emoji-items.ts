import { gitHubEmojis } from "@tiptap/extension-emoji";

/**
 * The emoji a `:` picker offers (PLAN.md STEP U9).
 *
 * The character is inserted as plain text rather than as a node: an emoji is
 * text, every renderer and every export already carries it, and a document
 * written today still reads on an instance that never had this picker.
 */

export interface EmojiChoice {
  readonly character: string;
  readonly name: string;
}

const CHOICES: EmojiChoice[] = gitHubEmojis
  .filter((item) => typeof item.emoji === "string")
  .map((item) => ({ character: item.emoji as string, name: item.name }));

/** How many the popup shows: enough to choose from, short enough to scan. */
const SHOWN = 12;

export function filterEmoji(query: string): EmojiChoice[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return CHOICES.slice(0, SHOWN);

  // Names that start with what was typed come first: ":sm" means "smile"
  // before "blacksmith".
  const starting = CHOICES.filter((choice) => choice.name.startsWith(needle));
  const containing = CHOICES.filter(
    (choice) => !choice.name.startsWith(needle) && choice.name.includes(needle),
  );
  return [...starting, ...containing].slice(0, SHOWN);
}
