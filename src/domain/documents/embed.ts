/**
 * What a document is allowed to frame (PLAN.md STEP U10).
 *
 * An embed is never an arbitrary `iframe`: a page URL is recognised by one of
 * the providers below or it is not embeddable at all. The allowlist is the
 * whole security boundary, so it lives in the domain, where the editor, the
 * schema that validates model output and the export targets all read the same
 * one — and adding a provider is one entry, never a branch somewhere.
 */

export interface EmbedTarget {
  /** What to name it where no frame can be drawn: "YouTube", "Vimeo". */
  readonly provider: string;
  /** The page a reader should be sent to. */
  readonly href: string;
  /** The frame URL, which is the only thing that ever reaches an `iframe`. */
  readonly src: string;
}

interface EmbedProvider {
  readonly name: string;
  readonly hosts: readonly string[];
  /** The frame URL for a page this provider owns, or null when it owns none. */
  frame(url: URL): string | null;
  /** Hosts the frames themselves come from, when they differ from `hosts`. */
  readonly frameHosts?: readonly string[];
}

/** An id in a path: long enough to be one, and made of nothing exotic. */
const ID = /^[\w-]{6,}$/;

const PROVIDERS: readonly EmbedProvider[] = [
  {
    name: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
    frame(url) {
      const [first, second] = url.pathname.split("/").filter(Boolean);
      const id =
        url.hostname === "youtu.be" ? first : first === "embed" ? second : url.searchParams.get("v");
      return id && ID.test(id) ? `https://www.youtube.com/embed/${id}` : null;
    },
  },
  {
    name: "Vimeo",
    hosts: ["vimeo.com", "www.vimeo.com"],
    frameHosts: ["player.vimeo.com"],
    frame(url) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    },
  },
  {
    name: "Loom",
    hosts: ["loom.com", "www.loom.com"],
    frame(url) {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      const shared = kind === "share" || kind === "embed";
      return shared && id && ID.test(id) ? `https://www.loom.com/embed/${id}` : null;
    },
  },
  {
    name: "Figma",
    hosts: ["figma.com", "www.figma.com"],
    frame(url) {
      const kind = url.pathname.split("/").filter(Boolean)[0];
      // Figma frames any of its own documents through one endpoint, which
      // takes the original URL as a parameter.
      const framed = kind === "file" || kind === "design" || kind === "proto" || kind === "board";
      return framed
        ? `https://www.figma.com/embed?embed_host=docyfier&url=${encodeURIComponent(url.toString())}`
        : null;
    },
  },
];

function pageUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** The embed a pasted or typed URL stands for, or null when nothing frames it. */
export function embedFor(value: string): EmbedTarget | null {
  const url = pageUrl(value);
  if (!url) return null;
  for (const provider of PROVIDERS) {
    if (!provider.hosts.includes(url.hostname)) continue;
    const src = provider.frame(url);
    if (src) return { provider: provider.name, href: url.toString(), src };
  }
  return null;
}

/**
 * What is wrong with a stored embed, in the shape the schema gate reads. A
 * model asked for a video can invent any URL it likes; this is where that
 * stops, before the attrs ever reach a node view.
 */
export function embedError(attrs: unknown): string | null {
  const { src, href } = (attrs ?? {}) as { src?: unknown; href?: unknown };
  if (typeof src !== "string" || !isEmbedFrame(src)) {
    return "An embed's src must be a frame from an allowed provider";
  }
  if (typeof href !== "string" || !pageUrl(href)) {
    return "An embed needs a link a reader can follow";
  }
  return null;
}

/**
 * Whether a stored `src` is a frame this allowlist could have produced. The
 * node view asks before drawing an `iframe`, so a hand-edited document can
 * never make the editor load a page nobody allowed.
 */
export function isEmbedFrame(src: string): boolean {
  const url = pageUrl(src);
  if (!url) return false;
  return PROVIDERS.some((provider) =>
    (provider.frameHosts ?? provider.hosts).includes(url.hostname),
  );
}
