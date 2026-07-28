import { copyBody, documentBody, emptyBody, type DocumentBody } from "./body";
import { copyOf, deriveTitle, titleOverride } from "./title";
import { DEFAULT_PRESET, normalizeTheme, type DocumentTheme } from "./theme";

/**
 * A document — the entity everything else in this product exists to serve.
 *
 * Every rule about what a document *is* lives here: how it is named, what
 * happens to its name when it is renamed or copied, that a copy is independent
 * of its source, that an edit moves the timestamp. None of that belongs to a
 * driver or to a server action, which is where it used to sit.
 *
 * Instances are immutable: every change returns a new document, so a caller
 * cannot half-apply one.
 */

/** The persisted shape — what a repository reads and writes. */
export interface DocumentRecord {
  id: string;
  /** Effective title: the override when renamed, otherwise the derived one.
   * Stored, not computed, so a repository can list without parsing bodies. */
  title: string;
  /** Set by an explicit rename. While it is set the title stops following the
   * content; clearing it hands the title back to the body. */
  titleOverride?: string;
  content: DocumentBody;
  theme: DocumentTheme;
  createdAt: string;
  updatedAt: string;
}

export class Document {
  private constructor(
    readonly id: string,
    readonly body: DocumentBody,
    readonly theme: DocumentTheme,
    readonly createdAt: string,
    readonly updatedAt: string,
    /** The frozen name, or null while the title follows the content. */
    private readonly override: string | null,
  ) {}

  /** A brand new document. */
  static create(input: {
    id: string;
    now: string;
    body?: unknown;
    theme?: unknown;
  }): Document {
    const body = input.body === undefined ? emptyBody() : documentBody(input.body);
    const theme = normalizeTheme(input.theme ?? { preset: DEFAULT_PRESET });
    return new Document(input.id, body, theme, input.now, input.now, null);
  }

  /**
   * A document as it was stored. Repairs on the way in: a body from a client
   * that sent nothing usable, and the theme of a document written before the
   * tokens existed. No render site should ever meet a shape it has to fix.
   */
  static restore(record: DocumentRecord): Document {
    return new Document(
      record.id,
      documentBody(record.content),
      normalizeTheme(record.theme),
      record.createdAt,
      record.updatedAt,
      record.titleOverride?.trim() || null,
    );
  }

  /** The name to show. A rename wins over whatever the content says. */
  get title(): string {
    return this.override ?? deriveTitle(this.body);
  }

  /** True while the title still follows the content. */
  get titleFollowsContent(): boolean {
    return this.override === null;
  }

  /** The same document with new content. */
  withBody(body: unknown, now: string): Document {
    return new Document(
      this.id,
      documentBody(body),
      this.theme,
      this.createdAt,
      now,
      this.override,
    );
  }

  /**
   * Rename. An empty title clears the override, so the name starts following
   * the content again instead of freezing on a blank string.
   */
  rename(title: string, now: string): Document {
    return new Document(
      this.id,
      this.body,
      this.theme,
      this.createdAt,
      now,
      titleOverride(title),
    );
  }

  /** A new presentation theme. Content is untouched. */
  withTheme(theme: unknown, now: string): Document {
    return new Document(
      this.id,
      this.body,
      normalizeTheme(theme),
      this.createdAt,
      now,
      this.override,
    );
  }

  /**
   * An independent copy. The copy carries its name as an override: two
   * documents with the same first heading would otherwise be indistinguishable
   * in the list.
   */
  duplicateAs(id: string, now: string): Document {
    return new Document(
      id,
      copyBody(this.body),
      this.theme,
      now,
      now,
      copyOf(this.title),
    );
  }

  toRecord(): DocumentRecord {
    const record: DocumentRecord = {
      id: this.id,
      title: this.title,
      content: this.body,
      theme: this.theme,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.override !== null) record.titleOverride = this.override;
    return record;
  }

  toSummary(): { id: string; title: string; updatedAt: string } {
    return { id: this.id, title: this.title, updatedAt: this.updatedAt };
  }
}
