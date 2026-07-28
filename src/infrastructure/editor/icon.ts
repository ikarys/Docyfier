import { mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { iconSpec } from "@/domain/authoring/icons";

/**
 * Shared `icon` attribute (PLAN.md STEP U6) for the blocks that can carry one:
 * callout, card, step and stat. The value is a name from `src/lib/icons.ts`;
 * anything unknown renders no icon.
 */
export const iconAttribute = {
  icon: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-icon"),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.icon ? { "data-icon": attrs.icon } : {},
  },
};

/**
 * Render a block with its icon placed before a wrapper holding the content.
 *
 * ProseMirror requires the content hole to be the only child of its parent, so
 * an icon means one extra element. The wrapper appears **only** when there is
 * an icon: an icon-less block keeps exactly the DOM — and therefore the CSS —
 * it had before U6.
 */
export function renderWithIcon(
  tag: string,
  attrs: Record<string, unknown>,
  htmlAttributes: Record<string, unknown>,
  bodyClass: string,
): DOMOutputSpec {
  const icon = iconSpec(attrs.icon);
  const element = mergeAttributes(htmlAttributes);
  if (!icon) return [tag, element, 0] as DOMOutputSpec;
  return [tag, element, icon, ["div", { class: bodyClass }, 0]] as DOMOutputSpec;
}

/** Like `renderWithIcon` but the wrapper is always emitted — for blocks whose
 * layout needs a single, predictable DOM shape (see `stat`). */
export function renderWithBody(
  tag: string,
  attrs: Record<string, unknown>,
  htmlAttributes: Record<string, unknown>,
  bodyClass: string,
): DOMOutputSpec {
  const icon = iconSpec(attrs.icon);
  const element = mergeAttributes(htmlAttributes);
  const body = ["div", { class: bodyClass }, 0];
  return (icon ? [tag, element, icon, body] : [tag, element, body]) as DOMOutputSpec;
}
