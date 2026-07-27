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
- **Templates**: "New document" opens a gallery — meeting notes, project
  one-pager, technical spec, status report, roadmap, incident postmortem,
  decision note — each a real document opening with its own theme preset.
- **Import**: bring in a `.md`, `.markdown`, `.txt` or `.docx` file — converted
  into an editable document (headings, lists, tables, code, quotes, marks).
  The import is faithful; reformatting is the AI "make it pretty" pass.
- **Document list**: search, inline rename, duplicate, and delete behind a
  confirmation.
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
- **Export**: Markdown (`↓ MD`, rich blocks projected onto standard markdown —
  a chart exports as its data table) and "PDF" via the browser print dialog
  (A4 print stylesheet).
- **Compose** (`/compose`): email and ticket composers — short writing that ends
  in the clipboard rather than in a document. An email from a brief (or an
  existing one rewritten) in a chosen tone; a ticket in the markup Jira,
  ServiceNow or GitLab expects.
- **Internal format**: ProseMirror JSON — the product's document format
  (see PLAN.md STEP 0). It makes reliable formatting, targeted AI edits, snapshots
  and multi-format export possible.

Not yet built (next STEPS in [PLAN.md](PLAN.md)): print-quality PDF via headless
Chromium (STEP 3, judged not worth its weight), multi-tenant (STEP 6), corporate
themes and style settings (STEP 9), diagrams. PDF **import** is deliberately out
of scope: a PDF carries layout, not structure.

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

Documents live in one of three backends, chosen under **Document storage** on
the Settings page — no rebuild, no restart:

| Backend | Where | Notes |
|---|---|---|
| Files (default) | JSON files under `data/documents/` (gitignored) | Override the location with `DOCYFIER_DATA_DIR` |
| PostgreSQL | `documents` table | Needs an existing database; the table is created on first connection |
| MySQL | `documents` table | Same |

The connection settings themselves always stay in `data/settings.json` — they
cannot be read from the database they configure. Saving a database
configuration is refused if the connection fails, so a typo cannot take the app
down. After switching to a database, **Import documents from files** copies the
documents still on disk into it (skipping ids already present, never deleting
the source files).

Env vars, same resolution order as above (Settings page > environment >
defaults):

| Variable | Default | Purpose |
|---|---|---|
| `DOCYFIER_DB_DRIVER` | `files` | `files`, `postgres` or `mysql` |
| `DOCYFIER_DB_HOST` | `localhost` | Database host |
| `DOCYFIER_DB_PORT` | `5432` / `3306` | Defaults to the driver's port |
| `DOCYFIER_DB_USER` | — | Database user |
| `DOCYFIER_DB_PASSWORD` | — | Database password |
| `DOCYFIER_DB_NAME` | — | Database name |
| `DOCYFIER_DB_SSL` | `0` | `1` connects over TLS (certificates verified) |

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
| `just docker-build` | Build the Docker image (`docyfier:latest`) |
| `just clean` | Remove `.next` |

Ports are overridable: `just dev 4000`.

## Key files

- `src/components/Editor.tsx` — Tiptap editor + formatting toolbar + autosave.
- `src/components/extensions/Callout.ts` — custom callout block node with variants.
- `src/components/AiPanel.tsx` / `SelectionAiMenu.tsx` / `GenerateHero.tsx` —
  the three AI surfaces.
- `src/lib/ai/` — LLM provider (LM Studio), prompts, schema validation, services.
- `src/lib/store/` — document store: facade + files / PostgreSQL / MySQL drivers.
- `src/lib/templates.ts` — document templates, validated against the editor
  schema at build time by `src/lib/doc/templates-check.ts`.
- `src/lib/doc/import.ts` — file import: markdown / text / docx → HTML →
  ProseMirror JSON parsed with the editor schema.
- `src/lib/doc/markdown.ts` — markdown export, served by
  `src/app/api/export/markdown/[id]/route.ts`.
- `src/lib/compose/` — email and ticket composers: one file per flow, each
  declaring its fields and building its own prompt.
- `src/app/actions.ts` — server actions: create / save / rename / duplicate / delete.
- `src/app/ai-actions.ts` — AI server actions: generate / transform / rewrite.
- `src/app/globals.css` — design system, editor chrome, and A4 print rules.
