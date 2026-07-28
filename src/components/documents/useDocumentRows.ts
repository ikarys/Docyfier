"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDocumentAction,
  duplicateDocumentAction,
  renameDocumentAction,
} from "@/app/actions";
import type { DocumentSummary } from "@/domain/documents/repository";

/**
 * The rows the list shows, and what happens to them.
 *
 * Mutations run server-side and `router.refresh()` pulls the authoritative list
 * back; the local copy exists only so the row does not sit there looking
 * unchanged in the meantime. That is also why the server list wins whenever it
 * arrives — a rename that failed must not survive as a local lie.
 */
export function useDocumentRows(docs: DocumentSummary[]) {
  const router = useRouter();
  const [rows, setRows] = useState(docs);
  const [, startTransition] = useTransition();

  useEffect(() => setRows(docs), [docs]);

  return {
    rows,

    rename(id: string, title: string) {
      setRows((current) =>
        current.map((doc) => (doc.id === id ? { ...doc, title } : doc)),
      );
      startTransition(async () => {
        await renameDocumentAction(id, title);
        router.refresh();
      });
    },

    duplicate(id: string) {
      startTransition(async () => {
        await duplicateDocumentAction(id);
        router.refresh();
      });
    },

    remove(id: string) {
      setRows((current) => current.filter((doc) => doc.id !== id));
      startTransition(async () => {
        await deleteDocumentAction(id);
      });
    },
  };
}
