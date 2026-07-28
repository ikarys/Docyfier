"use client";

import { useCallback, useRef, useState } from "react";
import { setDocumentThemeAction } from "@/app/actions";
import type { DocumentTheme } from "@/lib/themes";

/**
 * The document's dress: what it looks like now, and how a change to it reaches
 * the store. Every source of a theme goes through here — the Design panel, and
 * the art direction that arrives with a generated document.
 *
 * Writes are debounced: the accent color input fires once per pixel dragged.
 */
const THEME_DEBOUNCE_MS = 400;

export interface DocumentDress {
  theme: DocumentTheme;
  changeTheme(next: DocumentTheme): void;
}

export function useDocumentTheme(id: string, initialTheme: DocumentTheme): DocumentDress {
  const [theme, setTheme] = useState(initialTheme);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeTheme = useCallback(
    (next: DocumentTheme) => {
      setTheme(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void setDocumentThemeAction(id, next);
      }, THEME_DEBOUNCE_MS);
    },
    [id],
  );

  return { theme, changeTheme };
}
