"use client";

import { useEffect, useState } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { TableOfContents } from "@/infrastructure/editor/toc";

/** The TOC node wired to its React rendering — this is what the editor loads. */
export const TocNode = TableOfContents.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TocView);
  },
});

interface Entry {
  pos: number;
  level: number;
  text: string;
}

/**
 * Only **top-level** headings become entries. Headings nested in cards, steps
 * or a cover are titles of a component, not sections of the document, and
 * listing them turns the TOC into noise.
 */
function collectHeadings(doc: NodeViewProps["editor"]["state"]["doc"]): Entry[] {
  const entries: Entry[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent.trim();
    if (text) entries.push({ pos: offset, level: node.attrs.level as number, text });
  });
  return entries;
}

export function TocView({ editor, selected }: NodeViewProps) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const compute = () => setEntries(collectHeadings(editor.state.doc));
    compute();
    // Debounced: recomputing on every keystroke inside a heading would rebuild
    // the list character by character.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, 300);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [editor]);

  const goTo = (pos: number) => {
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      dom.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <NodeViewWrapper as="nav" className="doc-toc" data-selected={selected}>
      <p className="toc-title">Contents</p>
      {entries.length === 0 ? (
        <p className="toc-empty">Add headings and they will appear here.</p>
      ) : (
        <ol className="toc-list">
          {entries.map((entry) => (
            <li key={entry.pos} data-level={entry.level}>
              <button type="button" className="toc-link" onClick={() => goTo(entry.pos)}>
                {entry.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </NodeViewWrapper>
  );
}
