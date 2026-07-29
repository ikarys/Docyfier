import type { SlashItem } from "./slash/contract";
import { FIGURE_ITEMS } from "./slash/figure-items";
import { LAYOUT_ITEMS, PAGE_ITEMS } from "./slash/layout-items";
import { TEXT_ITEMS } from "./slash/text-items";

export type { SlashItem };

/**
 * Every block insertable from the slash menu — parity with the old toolbar's
 * block-insert buttons (see PLAN.md STEP U1). Table row/column edits stay in
 * a contextual popup, not here.
 *
 * The menu itself is four families in the order a writer reaches for them:
 * what they type into, what arranges it, what they look at, and what makes the
 * document a printed object. Adding a block is one entry in one family.
 */
export const SLASH_ITEMS: SlashItem[] = [
  ...TEXT_ITEMS,
  ...LAYOUT_ITEMS,
  ...FIGURE_ITEMS,
  ...PAGE_ITEMS,
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
  );
}
