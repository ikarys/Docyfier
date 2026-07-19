# Docyfier — Agent Instructions

Docyfier is a SaaS platform for AI-assisted writing and, above all, **formatting**
of professional documents. Inspired by Dust but much simpler and laser-focused on
document creation: turn raw text into modern, polished, well-structured documents.

## Sources of truth

- [vision.md](vision.md) — product vision and raw needs. Product questions resolve here.
- [PLAN.md](PLAN.md) — prioritized needs and roadmap in STEPS. **Check the current
  STEP before any work**; do not build ahead of it.

## Project status

**WYSIWYG editor + AI assistance implemented** (see [README.md](README.md)):
users create and edit documents in a Tiptap block editor (headings, lists,
tables, code, callouts), with autosave and PDF-via-print export. STEP 2 AI
surfaces are in: prompt-to-document (home), whole-document assistant panel
("make it pretty", tone, restructure), and selection-scoped rewrites (bubble
menu). LLM = local LM Studio via Vercel AI SDK (`src/lib/ai/`); AI output is
schema-validated ProseMirror JSON. No auth or multi-tenant yet.

Documents are ProseMirror JSON stored on disk (`src/lib/store.ts`), standing in
for the future database. The earlier markdown-file model was dropped: users arrive
with no source. Stack validated: Next.js + TypeScript + Tailwind v4 + Tiptap.
Node is pinned via `mise.toml`. Next: themes (STEP 2b in [PLAN.md](PLAN.md)).

## Working conventions

- All artifacts in English: code, comments, docs, commit messages, identifiers.
- Conventional Commits: `type(scope): subject`.
- No code until a STEP is explicitly started by the maintainer.
- Non-trivial tasks (multi-file, design choices): plan first, get approval, then execute.
- Keep diffs small and focused; one concern per commit.
