import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/**
 * The code block, with the language it is written in (PLAN.md STEP U9).
 *
 * The node keeps its name — `codeBlock` — and its shape, so every renderer,
 * every export and every stored document are untouched; what changes is that
 * the editor now colours it.
 *
 * The languages are chosen rather than bundled wholesale: `common` from
 * highlight.js is some forty grammars, most of which a professional document
 * will never hold, and every one of them ships to the browser.
 */

export const CODE_LANGUAGES: { readonly id: string; readonly label: string }[] = [
  { id: "", label: "Plain text" },
  { id: "bash", label: "Bash" },
  { id: "css", label: "CSS" },
  { id: "diff", label: "Diff" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
  { id: "php", label: "PHP" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "sql", label: "SQL" },
  { id: "typescript", label: "TypeScript" },
  { id: "xml", label: "HTML / XML" },
  { id: "yaml", label: "YAML" },
];

const lowlight = createLowlight();
lowlight.register({
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
});

export const HighlightedCodeBlock = CodeBlockLowlight.configure({ lowlight });
