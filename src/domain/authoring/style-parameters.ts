/**
 * The instance's writing style (PLAN.md STEP 9, need #15).
 *
 * These are the choices a user makes once, for every document: whether emoji
 * are welcome, whether the model emphasizes keywords, whether statuses come out
 * as badges, and which language to write in. They are not part of a document —
 * two documents written under different settings both keep whatever they say —
 * so they belong here, next to the prompts they steer, and not to the entity.
 *
 * Defaults are today's behaviour exactly: no emoji, no automatic bolding,
 * badges on, and the language of the request.
 */

export interface StyleParametersRecord {
  /** Emoji are allowed as sparing visual anchors. */
  emoji: boolean;
  /** The words carrying the meaning of a paragraph come out bold. */
  autoBold: boolean;
  /** Statuses, priorities and tags always render as badge marks. */
  statusBadges: boolean;
  /** Language every document is written in; empty follows the request. */
  language: string;
}

/** Long enough for "Brazilian Portuguese", short enough to stay a language. */
const MAX_LANGUAGE = 40;

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const DEFAULTS: StyleParametersRecord = {
  emoji: false,
  autoBold: false,
  statusBadges: true,
  language: "",
};

export class StyleParameters {
  private constructor(private readonly values: StyleParametersRecord) {}

  static defaults(): StyleParameters {
    return new StyleParameters(DEFAULTS);
  }

  /** Anything stored or submitted, coerced. A field that makes no sense falls
   * back on its default: a style setting is never worth failing a page for. */
  static restore(raw: unknown): StyleParameters {
    const record = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<
      StyleParametersRecord
    >;
    return new StyleParameters({
      emoji: readBoolean(record.emoji, DEFAULTS.emoji),
      autoBold: readBoolean(record.autoBold, DEFAULTS.autoBold),
      statusBadges: readBoolean(record.statusBadges, DEFAULTS.statusBadges),
      language:
        typeof record.language === "string"
          ? record.language.trim().slice(0, MAX_LANGUAGE)
          : DEFAULTS.language,
    });
  }

  get emoji(): boolean {
    return this.values.emoji;
  }

  /** Whether the writing language is imposed rather than followed. */
  get imposesLanguage(): boolean {
    return this.values.language !== "";
  }

  /**
   * The lines these settings add to the style guide. Each one states a rule the
   * model can follow; nothing here describes what the editor can render, which
   * is the format contract's job.
   */
  directives(): string {
    return [
      this.values.emoji
        ? "- Emoji are welcome as sparing visual anchors — at most one per heading or callout, never inside body prose."
        : "- Emoji: only when the user explicitly asks for emoji.",
      this.values.autoBold
        ? "- Bold the two or three words per paragraph that carry its meaning — figures, decisions, names — so a reader skimming gets the point. Never bold a whole sentence."
        : "",
      this.values.statusBadges
        ? '- Statuses, priorities and tags ALWAYS render as badge marks, wherever they appear (table cells, lists, paragraphs): e.g. "On track" green badge, "At risk" yellow badge, "Blocked" red badge, "P1" red badge, "Beta" purple.'
        : "",
      this.values.language
        ? `- Write the document in ${this.values.language}, whatever language the request is in.`
        : "- Write the document in the same language as the user's request or content.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  toRecord(): StyleParametersRecord {
    return { ...this.values };
  }
}
