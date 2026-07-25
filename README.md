# Docyfier

SaaS for AI-assisted writing and formatting of professional documents.
See [vision.md](vision.md) for the product vision and [PLAN.md](PLAN.md) for the roadmap.

## Current state — WYSIWYG editor + AI assistance

Users arrive with no source file: they describe a document (or start blank) and
work in a rich block editor with AI help. There is no dependency on markdown files.

- **Generate from a prompt** (home page): describe the document, the AI drafts
  it fully formatted straight into the editor.
- **AI assistant panel** (editor): whole-document operations — restructure
  ("Make it pretty"), shorten, change tone, add sections — via chat or one-click
  actions.
- **Selection AI menu**: select text → floating menu with quick rewrites
  (rephrase / shorten / expand / formal) or a free prompt applied only to the
  selection.
- **Create / edit / delete** documents from the home list.
- **Block editor** (Tiptap / ProseMirror): headings, bold/italic/strike/underline/
  inline code, links, text alignment, bullet & ordered lists, blockquote, code
  block, tables, horizontal rule, undo/redo, and colored **callouts**
  (note / tip / warn / danger). Type `/` to insert any block.
- **Presentation blocks**: card grids, columns, key-figure rows (compact or
  full-width dashboard cards), timelines, step lists, pyramids, bar & line
  **charts** (inline SVG), a document **cover** and a **table of contents**.
- **Images**: paste, drag-drop or pick a file — uploaded, stored and re-rendered
  at 25 / 50 / 75 / 100 % of the text column.
- **Themes**: four presets, each an adjustable token set — accent color, font
  pair, corner radius and density — edited live in the Design panel. Themes are
  presentation only and never touch document content.
- **Autosave**: edits persist automatically (debounced) with a save indicator.
- **Export**: "PDF" via the browser print dialog (A4 print stylesheet).
- **Internal format**: ProseMirror JSON — the product's document format
  (see PLAN.md STEP 0). It makes reliable formatting, targeted AI edits, snapshots
  and multi-format export possible.

Not yet built (next STEPS in [PLAN.md](PLAN.md)): streaming and targeted AI
transforms (U4), templates (U5), Markdown/richer export, diagrams, multi-tenant,
auth.

## AI setup (LM Studio)

AI calls go through the Vercel AI SDK to any OpenAI-compatible server
(LM Studio, Ollama, vLLM…); the default target is a local **LM Studio**
instance:

1. Start LM Studio, load a model, enable the local server (default
   `http://localhost:1234`).
2. That's it — the first loaded model is auto-detected.

Configure the endpoint, model and API key on the **Settings page** (`/settings`,
gear icon in the header), with a connection test and a model picker. Settings
are persisted next to the document store (`data/settings.json`).

Resolution order: Settings page > environment > defaults. Env vars
(`.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `DOCYFIER_LLM_BASE_URL` | `http://localhost:1234/v1` | OpenAI-compatible endpoint |
| `DOCYFIER_LLM_MODEL` | first model on the server | Model id |
| `DOCYFIER_LLM_API_KEY` | `lm-studio` | Key for providers that need one |
| `DOCYFIER_LLM_MAX_TOKENS` | `32768` | Max tokens per AI response |

Every AI response is ProseMirror JSON validated against the editor schema
server-side (invalid output → one retry) before it touches the document.

## Storage

Documents are stored as JSON files under `data/documents/` (gitignored). Override
the location with `DOCYFIER_DATA_DIR`. This fs store stands in for the database
that arrives in a later STEP; its on-disk shape is deliberately DB-shaped.

## Requirements

- Node `24.18.0` (pinned in `.nvmrc`; `nvm use`).

## Getting started

```bash
nvm use        # switch to pinned Node version
just setup     # npm install
just dev       # http://localhost:3000
```

Or without `just`: `nvm use && npm install && npm run dev`.

## Tasks (Justfile)

| Command | Purpose |
|---|---|
| `just setup` | Install Node toolchain + deps |
| `just dev` | Dev server (hot reload) |
| `just build` | Production build |
| `just start` | Serve the production build |
| `just serve` | build + start |
| `just check` | typecheck + lint |
| `just clean` | Remove `.next` |

Ports are overridable: `just dev 4000`.

## Key files

- `src/components/Editor.tsx` — Tiptap editor + formatting toolbar + autosave.
- `src/components/extensions/Callout.ts` — custom callout block node with variants.
- `src/components/AiPanel.tsx` / `SelectionAiMenu.tsx` / `GenerateHero.tsx` —
  the three AI surfaces.
- `src/lib/ai/` — LLM provider (LM Studio), prompts, schema validation, services.
- `src/lib/store.ts` — file-backed document store (ProseMirror JSON).
- `src/app/actions.ts` — server actions: create / save / delete.
- `src/app/ai-actions.ts` — AI server actions: generate / transform / rewrite.
- `src/app/globals.css` — design system, editor chrome, and A4 print rules.
