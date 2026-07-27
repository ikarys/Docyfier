import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * What the domain must never reach for. The rule in AGENTS.md — "the domain
 * imports nothing" — is only worth writing down if a machine enforces it: a
 * boundary nobody can cross by accident is the only kind that survives.
 *
 * Warnings for now, errors once settings, the AI client and the components move
 * behind their own ports.
 */
const FRAMEWORK_IMPORTS = [
  { name: "react", message: "The domain must not know a UI library." },
  { name: "react-dom", message: "The domain must not know a UI library." },
  { name: "server-only", message: "The domain is neither server nor client." },
  { name: "ai", message: "Put the model behind a port instead." },
  { name: "pg", message: "Put persistence behind a repository instead." },
  { name: "mysql2", message: "Put persistence behind a repository instead." },
];

const FRAMEWORK_PATTERNS = [
  { group: ["next", "next/*"], message: "The domain must not know the framework." },
  {
    group: ["@tiptap/*"],
    message: "The document body is a domain type, not an editor's.",
  },
  { group: ["node:*"], message: "I/O belongs to an adapter, behind a port." },
];

/** Layers below must not reach up into the ones that depend on them. */
const UPWARD_PATTERNS = [
  {
    group: ["@/app/*", "@/components/*"],
    message: "Dependencies point inward: the framework layer sits above this one.",
  },
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/domain/**/*.ts"],
    ignores: ["src/domain/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: FRAMEWORK_IMPORTS,
          patterns: [...FRAMEWORK_PATTERNS, ...UPWARD_PATTERNS],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts"],
    ignores: ["src/application/**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["warn", { patterns: UPWARD_PATTERNS }],
    },
  },
];

export default eslintConfig;
