"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteDocumentAction,
  duplicateDocumentAction,
  renameDocumentAction,
} from "@/app/actions";
import type { DocumentSummary } from "@/lib/store";

/**
 * The document list (PLAN.md STEP U5): search, inline rename, duplicate and a
 * two-step delete. Mutations run server-side, then `router.refresh()` pulls the
 * authoritative list back — the local copy only keeps the UI from flashing
 * stale rows in the meantime.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DocumentList({ docs }: { docs: DocumentSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(docs);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The server list wins whenever it changes (mutation, navigation back here).
  useEffect(() => setRows(docs), [docs]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((doc) => doc.title.toLowerCase().includes(needle))
    : rows;

  const rename = (id: string, title: string) => {
    setRenaming(null);
    setRows((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, title } : doc)),
    );
    startTransition(async () => {
      await renameDocumentAction(id, title);
      router.refresh();
    });
  };

  const duplicate = (id: string) => {
    startTransition(async () => {
      await duplicateDocumentAction(id);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    setConfirming(null);
    setRows((current) => current.filter((doc) => doc.id !== id));
    startTransition(async () => {
      await deleteDocumentAction(id);
    });
  };

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        No documents yet. Describe one above, or start from a template.
      </div>
    );
  }

  return (
    <>
      <div className="doc-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          aria-label="Search documents"
        />
        <span className="doc-search-count">
          {visible.length} of {rows.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">No document matches “{query.trim()}”.</div>
      ) : (
        visible.map((doc) => (
          <div key={doc.id} className="doc-card">
            {renaming === doc.id ? (
              <form
                className="doc-rename"
                onSubmit={(e) => {
                  e.preventDefault();
                  const field = e.currentTarget.elements.namedItem(
                    "title",
                  ) as HTMLInputElement;
                  rename(doc.id, field.value);
                }}
              >
                <input
                  name="title"
                  defaultValue={doc.title}
                  autoFocus
                  aria-label="Document title"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
                <button className="btn btn-primary" type="submit">
                  Save
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setRenaming(null)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <Link href={`/doc/${doc.id}`} className="doc-card-main">
                <span className="doc-card-title">{doc.title}</span>
                <span className="doc-card-slug">
                  edited {formatDate(doc.updatedAt)}
                </span>
              </Link>
            )}

            {renaming === doc.id ? null : confirming === doc.id ? (
              <div className="doc-card-actions">
                <span className="doc-confirm">Delete this document?</span>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => remove(doc.id)}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="doc-card-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => setRenaming(doc.id)}
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
                  onClick={() => setConfirming(doc.id)}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
