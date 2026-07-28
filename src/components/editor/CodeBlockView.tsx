"use client";

import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { CODE_LANGUAGES, HighlightedCodeBlock } from "@/infrastructure/editor/code-block";

/**
 * A code block that says what it is written in (PLAN.md STEP U9). The picker
 * only shows while editing: what prints and what exports is the code.
 */
function CodeBlock({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";

  return (
    <NodeViewWrapper className="code-block">
      {editor.isEditable && (
        <select
          className="code-language no-print"
          value={language}
          contentEditable={false}
          aria-label="Code language"
          onChange={(event) => updateAttributes({ language: event.target.value || null })}
        >
          {CODE_LANGUAGES.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      )}
      {/* The content element is the `<code>` ProseMirror writes into; the
          wrapper below it is what carries the highlighting classes. */}
      <pre>
        <NodeViewContent as={"code" as "div"} />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlockNode = HighlightedCodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlock);
  },
});
