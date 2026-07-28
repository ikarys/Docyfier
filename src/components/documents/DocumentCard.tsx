"use client";

import Link from "next/link";
import type { DocumentSummary } from "@/domain/documents/repository";

/** One row, in one of its three modes: linked, being renamed, or confirming a delete. */
export type CardMode = "linked" | "renaming" | "confirming";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DocumentCard({
  doc,
  mode,
  setMode,
  rename,
  duplicate,
  remove,
}: {
  doc: DocumentSummary;
  /** Held by the list: only one row is ever mid-rename or mid-delete. */
  mode: CardMode;
  setMode: (mode: CardMode) => void;
  rename: (id: string, title: string) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}) {
  return (
    <div className="doc-card">
      {mode === "renaming" ? (
        <form
          className="doc-rename"
          onSubmit={(e) => {
            e.preventDefault();
            const field = e.currentTarget.elements.namedItem("title") as HTMLInputElement;
            setMode("linked");
            rename(doc.id, field.value);
          }}
        >
          <input
            name="title"
            defaultValue={doc.title}
            autoFocus
            aria-label="Document title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setMode("linked");
            }}
          />
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <button className="btn" type="button" onClick={() => setMode("linked")}>
            Cancel
          </button>
        </form>
      ) : (
        <Link href={`/doc/${doc.id}`} className="doc-card-main">
          <span className="doc-card-title">{doc.title}</span>
          <span className="doc-card-slug">edited {formatDate(doc.updatedAt)}</span>
        </Link>
      )}

      {mode === "confirming" && (
        <div className="doc-card-actions">
          <span className="doc-confirm">Delete this document?</span>
          <button className="btn" type="button" onClick={() => setMode("linked")}>
            Cancel
          </button>
          <button className="btn btn-danger" type="button" onClick={() => remove(doc.id)}>
            Delete
          </button>
        </div>
      )}

      {mode === "linked" && (
        <div className="doc-card-actions">
          <button
            className="btn"
            type="button"
            onClick={() => setMode("renaming")}
            title="Rename"
          >
            Rename
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => duplicate(doc.id)}
            title="Duplicate"
          >
            Duplicate
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => setMode("confirming")}
            title="Delete"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
