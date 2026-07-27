/**
 * Inline icon set (PLAN.md STEP U6). A closed map: nodes reference an icon by
 * name from their `icon` attribute, and an unknown name simply renders no icon
 * — never a crash, never a network request, never an icon package.
 *
 * Every glyph is one stroked `path` on a 24×24 grid using `currentColor`, so an
 * icon inherits the accent of the block it sits in and prints at any size.
 * Circles are drawn as arcs inside the same `d` to keep one path per icon.
 */

export const ICONS = {
  chart: "M4 20V11M10 20V4M16 20v-6M2 20h20",
  "trend-up": "M3 16l5-5 4 4 8-8M15 7h6v6",
  "trend-down": "M3 8l5 5 4-4 8 8M15 17h6v-6",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18M12 7v5l3.5 2",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  check: "M4 12.5l5 5L20 6.5",
  "check-circle": "M12 3a9 9 0 100 18 9 9 0 000-18M8 12l3 3 5-5",
  alert: "M12 3L2 20h20L12 3zM12 10v5M12 17.8v.4",
  info: "M12 3a9 9 0 100 18 9 9 0 000-18M12 11v6M12 7.3v.4",
  "x-circle": "M12 3a9 9 0 100 18 9 9 0 000-18M9 9l6 6M15 9l-6 6",
  users:
    "M8 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.7a3.5 3.5 0 010 6.6M18 14.6c2.4.8 4 3 4 5.4",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8M4 21c0-4 3.6-7 8-7s8 3 8 7",
  target:
    "M12 3a9 9 0 100 18 9 9 0 000-18M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9M12 11.4a.6.6 0 100 1.2.6.6 0 000-1.2",
  flag: "M5 21V4M5 5h12l-2 4 2 4H5",
  star: "M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  lightbulb:
    "M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5.9 1.2.9 1.9v.2h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0012 3z",
  rocket:
    "M12 2c3 2.5 4.5 6 4.5 10L12 17l-4.5-5C7.5 8 9 4.5 12 2zM12 8.4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6M8 18l-2 4 4-2M16 18l2 4-4-2",
  shield: "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3z",
  lock: "M6 11h12v10H6zM9 11V7.5a3 3 0 016 0V11",
  key: "M14 4a5 5 0 100 10 5 5 0 000-10M10.5 12.5L3 20v1h3v-2h2v-2h2z",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14M16 16l5 5",
  document: "M6 3h8l4 4v14H6zM14 3v4h4",
  clipboard: "M9 4h6v3H9zM7 5.5H5.5v15h13v-15H17",
  folder: "M3 7h6l2 2h10v11H3z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  link: "M10 14a4 4 0 006 .5l2.5-2.5a4 4 0 00-5.7-5.7L11.5 7.5M14 10a4 4 0 00-6-.5L5.5 12a4 4 0 005.7 5.7L12.5 16.5",
  settings:
    "M12 9a3 3 0 100 6 3 3 0 000-6M12 2v3M12 19v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2 12h3M19 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1",
  zap: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  globe:
    "M12 3a9 9 0 100 18 9 9 0 000-18M3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3",
  money: "M3 6h18v12H3zM12 9a3 3 0 100 6 3 3 0 000-6M6 9.2v.01M18 14.8v.01",
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

const SVG_NS = "http://www.w3.org/2000/svg";

/** The path data for `name`, or null when the name is not in the set. */
export function iconPath(name: unknown): string | null {
  return typeof name === "string" && name in ICONS
    ? ICONS[name as IconName]
    : null;
}

/**
 * The icon as a ProseMirror `DOMOutputSpec` fragment, or null. Nodes that
 * render through `renderHTML` (no React) use this to place the glyph before
 * their content wrapper.
 */
export function iconSpec(name: unknown): unknown[] | null {
  const d = iconPath(name);
  if (!d) return null;
  // ProseMirror creates elements with `createElement` unless the tag name is
  // prefixed with a namespace, which yields an inert HTMLUnknownElement for
  // <svg> — the icon exists in the DOM and draws nothing. Children inherit the
  // namespace, so only the root tag needs it.
  return [
    `${SVG_NS} svg`,
    {
      class: "block-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    ["path", { d }],
  ];
}
