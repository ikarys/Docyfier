"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * A line of news where the picture is going to land: how far a batch of
 * uploads has got, and which file did not make it (PLAN.md STEP U10).
 *
 * A decoration rather than a dialog, because the writer's question is "what is
 * happening *here*" — and because a decoration is mapped through every edit
 * they make while the upload runs. The wording is `upload-report.ts`.
 */

/** A note is identified by the object the caller holds, so ids never collide. */
export type UploadNoteId = object;

interface ShowNote {
  readonly id: UploadNoteId;
  readonly pos: number;
  readonly text: string;
  readonly variant: "progress" | "failure";
}

type NoteAction = { readonly show: ShowNote } | { readonly hide: UploadNoteId };

const uploadNotes = new PluginKey<DecorationSet>("uploadNotes");

function noteWidget({ id, pos, text, variant }: ShowNote): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const span = document.createElement("span");
      span.className = `upload-note is-${variant}`;
      span.textContent = text;
      return span;
    },
    { id, side: 1 },
  );
}

function show(view: EditorView, note: ShowNote): void {
  view.dispatch(view.state.tr.setMeta(uploadNotes, { show: note }));
}

export function showUploadProgress(
  view: EditorView,
  id: UploadNoteId,
  pos: number,
  text: string,
): void {
  show(view, { id, pos, text, variant: "progress" });
}

export function showUploadFailure(
  view: EditorView,
  id: UploadNoteId,
  pos: number,
  text: string,
): void {
  show(view, { id, pos, text, variant: "failure" });
}

export function hideUploadNote(view: EditorView, id: UploadNoteId): void {
  view.dispatch(view.state.tr.setMeta(uploadNotes, { hide: id }));
}

export const UploadNotes = Extension.create({
  name: "uploadNotes",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: uploadNotes,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const mapped = set.map(tr.mapping, tr.doc);
            const action = tr.getMeta(uploadNotes) as NoteAction | undefined;
            if (!action) return mapped;

            const id = "hide" in action ? action.hide : action.show.id;
            const previous = mapped.find(undefined, undefined, (spec) => spec.id === id);
            const without = mapped.remove(previous);
            if ("hide" in action) return without;

            // A note that is only changing its words stays where the document
            // has carried it, not where the upload first asked for it.
            const pos = previous.length > 0 ? previous[0].from : action.show.pos;
            return without.add(tr.doc, [noteWidget({ ...action.show, pos })]);
          },
        },
        props: {
          decorations(state) {
            return uploadNotes.getState(state);
          },
        },
      }),
    ];
  },
});
