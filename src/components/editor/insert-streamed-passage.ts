import type { Editor } from "@tiptap/react";
import { requestPassageBlocks, type PassageAnswer, type PassageRequest } from "./passage-request";
import { StreamedPassage, type Range } from "./streamed-passage";

/**
 * A passage rewritten in instalments: each block replaces a little more of what
 * the user selected, and the whole answer is one edit.
 *
 * Focus is deliberately not taken on each block. The writer may well be reading
 * the answer as it lands, and a caret yanked back six times in two seconds is
 * worse than the wait this replaced.
 */
export async function insertStreamedPassage(
  editor: Editor,
  request: PassageRequest,
  passageRange: Range,
): Promise<PassageAnswer> {
  const passage = new StreamedPassage(passageRange);

  const answer = await requestPassageBlocks(request, (block) => {
    const before = editor.state.doc.content.size;
    editor.chain().insertContentAt(passage.target, block).run();
    passage.grewBy(editor.state.doc.content.size - before);
  });

  // A stream that ended badly — a provider that dropped it, or an assistant
  // that broke its charter — leaves part of an answer where a passage used to
  // be. Half an edit is not an edit anyone asked for, so it goes back rather
  // than staying for the user to find and undo.
  if (answer.error && passage.started) {
    editor.chain().insertContentAt(passage.written, request.blocks).run();
  }

  return answer;
}
