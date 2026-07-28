"use client";

import { useState } from "react";
import type { DocumentSummary } from "@/domain/documents/repository";
import { DocumentCard, type CardMode } from "./documents/DocumentCard";
import { matchingDocuments } from "./documents/matching";
import { useDocumentRows } from "./documents/useDocumentRows";

/**
 * The document list (PLAN.md STEP U5): search, inline rename, duplicate and a
 * two-step delete.
 */
export function DocumentList({ docs }: { docs: DocumentSummary[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<{ id: string; mode: CardMode } | null>(null);
  const { rows, rename, duplicate, remove } = useDocumentRows(docs);
  const visible = matchingDocuments(rows, query);

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
          <DocumentCard
            key={doc.id}
            doc={doc}
            mode={active?.id === doc.id ? active.mode : "linked"}
            setMode={(mode) => setActive(mode === "linked" ? null : { id: doc.id, mode })}
            rename={rename}
            duplicate={duplicate}
            remove={remove}
          />
        ))
      )}
    </>
  );
}
