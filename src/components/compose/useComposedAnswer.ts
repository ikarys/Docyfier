"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { ComposeState } from "@/app/compose/actions";

/** What the editor held before the run in progress, so one step can be taken
 * back — an answer overwrites what the user typed. */
interface Snapshot {
  doc: JSONContent;
  isAnswer: boolean;
}

/**
 * Where a composer is in its cycle: still the user's input, or an answer that
 * can be copied, improved, or taken back one step.
 *
 * The answer lands in the editor itself rather than in a box below it, which is
 * why the previous content has to be kept: composing again would otherwise
 * silently destroy what someone typed.
 */
export function useComposedAnswer(editor: Editor | null, state: ComposeState) {
  const [isAnswer, setIsAnswer] = useState(false);
  const [composed, setComposed] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [previous, setPrevious] = useState<Snapshot | null>(null);

  // Keyed on the state object rather than on its content: the editor becomes
  // available after the first render, and re-running the effect then would
  // overwrite whatever the user has already typed into the answer.
  const applied = useRef<ComposeState>(null);
  useEffect(() => {
    if (!editor || !state?.doc || applied.current === state) return;
    applied.current = state;
    editor.commands.setContent(state.doc);
    setIsAnswer(true);
    setComposed(true);
    setGuidance("");
  }, [state, editor]);

  return {
    isAnswer,
    composed,
    guidance,
    setGuidance,
    canRestore: previous !== null,

    /** Called as a run starts, with what is about to be replaced. */
    remember(doc: JSONContent) {
      setPrevious({ doc, isAnswer });
    },

    restore() {
      if (!previous || !editor) return;
      editor.commands.setContent(previous.doc);
      setIsAnswer(previous.isAnswer);
      setPrevious(null);
    },
  };
}
