# Docyfier — Agent Instructions

Docyfier is a SaaS platform for AI-assisted writing and, above all, **formatting**
of professional documents. Inspired by Dust but much simpler and laser-focused on
document creation: turn raw text into modern, polished, well-structured documents.

## Sources of truth

- [docs/vision.md](docs/vision.md) — product vision and raw needs. Product questions resolve here.
- [PLAN.md](PLAN.md) — prioritized needs and roadmap in STEPS. **Check the current
  STEP before any work**; do not build ahead of it.

## Project status

**WYSIWYG editor + AI assistance implemented** (see [README.md](README.md)):
users create and edit documents in a Tiptap block editor (headings, lists,
tables, code, callouts), with autosave and PDF-via-print export. STEP 2 AI
surfaces are in: prompt-to-document (home), whole-document assistant panel
("make it pretty", tone, restructure), and selection-scoped rewrites (bubble
menu). LLM = local LM Studio via Vercel AI SDK (`src/lib/ai/`); AI output is
schema-validated ProseMirror JSON. Single-user auth is in and opt-in (STEP 4):
one password, off until credentials exist. No multi-tenant yet.

Documents are ProseMirror JSON kept in files, PostgreSQL or MySQL — one driver
among three behind `src/lib/store/`, selected at runtime from the Settings page. The earlier markdown-file model was dropped: users arrive
with no source. Stack validated: Next.js + TypeScript + Tailwind v4 + Tiptap.
Node is pinned via `.nvmrc` (nvm).

Editor UX and rendering STEPS U1–U6 are in: slash menu and drag handles;
streaming generation, op-based transforms and AI diff review; themes as
adjustable token sets (accent, font pair, radius, density) with a Design panel;
images, cover, table of contents and print control; charts, block icons and
dashboard stat cards; templates gallery with search/rename/duplicate in the
document list; file import (md / txt / docx) and pluggable export targets
(Word, Confluence, Notion, Trilium) from STEP 5 — see `src/lib/export/`, where
adding a target is one file plus a line in the registry. Settings is one route
per scope (`/settings/{ai,storage,exports,access}`). STEP 8 is in: the email and
ticket composers under `/compose`, same plugin shape in `src/lib/compose/` —
short-form writing that ends in the clipboard, not in a document. Next: STEP 6
(multi-tenant) or STEP 9 (templates, themes, style settings). PDF stays
print-based on purpose; a headless-Chromium renderer is the only open item of
STEP 3 and was judged not worth its weight.

## Working conventions

- All artifacts in English: code, comments, docs, commit messages, identifiers.
- Conventional Commits: `type(scope): subject`.
- No code until a STEP is explicitly started by the maintainer.
- Non-trivial tasks (multi-file, design choices): plan first, get approval, then execute.
- Keep diffs small and focused; one concern per commit.
