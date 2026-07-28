<p align="center">
  <img src="docs/assets/banner.svg" alt="Docyfier — Make the document they remember." width="820">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="License: AGPL v3"></a>
  <a href="https://github.com/ikarys/Docyfier/pkgs/container/docyfier"><img src="https://img.shields.io/badge/ghcr.io-docyfier-2496ED?logo=docker&logoColor=white" alt="Docker image"></a>
  <a href="#ai-provider"><img src="https://img.shields.io/badge/AI-bring_your_own_model-8A2BE2" alt="Bring your own model"></a>
</p>

The client, the steering committee, your manager — none of them read your
document, they *look* at it first. A wall of unstyled text reads as a draft. A
cover page, a clear structure and a chart that makes the point read as work
someone thought about.

Getting there normally costs an afternoon: a chatbot hands you a wall of
markdown, Word hands you a blank page and a style menu. Docyfier hands you the
finished document — cover, table of contents, callouts, tables, charts, stat
cards — from a prompt, or from the draft you already have. Then you edit it
like a real document, because it is one, in a real block editor. Not a chat
transcript you reformat by hand.

- **Formatting is the product.** Everything else — templates, themes, blocks,
  the "make it pretty" pass — exists so a document leaves looking designed.
- **Bring your own model.** Any OpenAI-compatible server, local or hosted. Your
  drafts and prompts never have to leave your network.
- **Leaves in the shape they asked for.** Word, Markdown, Confluence, Notion,
  Trilium, PDF. Adding another target is one file.
- **Yours to run.** One container, one volume, AGPL. No seat pricing, no
  document quota, no telemetry.

## Features

**Writing with AI**

- **Generate from a prompt** — describe a document, get it drafted and
  formatted straight into the editor.
- **Document assistant** — whole-document operations: restructure, "make it
  pretty", shorten, change tone, add sections, via chat or one-click actions.
- **Selection rewrites** — select text, get a floating menu with rephrase /
  shorten / expand / formal, or apply a free prompt to that selection only.
- **Diff review** — AI edits arrive as a reviewable diff, applied or rejected
  block by block, never as a silent overwrite.

**The editor**

- Block editor built on Tiptap / ProseMirror: headings, bold / italic / strike /
  underline / inline code, links, alignment, lists, blockquotes, code blocks,
  tables, and colored **callouts** (note / tip / warn / danger). Type `/` for
  the insert menu; drag handles reorder anything.
- **Presentation blocks**: card grids, columns, key-figure rows, dashboard stat
  cards, timelines, step lists, pyramids, and bar & line **charts** rendered as
  inline SVG.
- **Images**: paste, drag-drop or pick a file, re-rendered at 25 / 50 / 75 /
  100 % of the text column.
- **Cover page and table of contents**, with print control for both.
- **Themes**: presets that are adjustable token sets — accent color, font pair,
  corner radius, density — edited live in a Design panel. Themes are
  presentation only and never touch document content.
- **Autosave**, debounced, with a save indicator.

**Getting content in and out**

- **Templates**: meeting notes, project one-pager, technical spec, status
  report, roadmap, incident postmortem, decision note — each a real document
  with its own theme preset.
- **Import**: `.md`, `.markdown`, `.txt` and `.docx` become editable documents
  with their structure intact. PDF import is deliberately out of scope — a PDF
  carries layout, not structure.
- **Export**: Word (`.docx`), Markdown, Confluence, Notion, Trilium, and PDF
  through the browser print dialog against an A4 stylesheet. Targets are
  plugins: one adapter in `src/infrastructure/publishing/targets/` plus a line
  in the registry.
- **Compose**: short-form writing that ends in the clipboard instead of a
  document — an email from a brief in a chosen tone, or a ticket in the markup
  Jira, ServiceNow or GitLab expects.

Documents are stored as **ProseMirror JSON**, not markdown. That is what makes
reliable formatting, targeted AI edits and multi-format export possible.

## Quick start

### With Docker

```bash
docker run -p 3000:3000 \
  -v docyfier-data:/data \
  -e DOCYFIER_LLM_BASE_URL=http://<your-model-server>:1234/v1 \
  ghcr.io/<owner>/docyfier:latest
```

Open <http://localhost:3000>. Everything else is configurable from the Settings
page once the app is running.

### From source

Requires Node `24.18.0` (pinned in `.nvmrc`).

```bash
nvm use
npm install
npm run dev        # http://localhost:3000
```

With [`just`](https://github.com/casey/just): `just setup && just dev`.

## Configuration

Every setting below resolves in the same order: **Settings page > environment
variables > defaults**. The Settings page (`/settings`) is split by scope —
`ai`, `storage`, `exports`, `access` — and writes to `settings.json` next to
the document store, so nothing here requires a rebuild or a restart.

### AI providers

Calls go through the Vercel AI SDK to any OpenAI-compatible endpoint — LM
Studio, Ollama, vLLM, llama.cpp, or a hosted API that speaks the same protocol.
Point the base URL at your server, and the model picker on the Settings page
lists what it offers (with a connection test).

**Several providers can be configured side by side** — a local model and a
hosted one, or two accounts — each with its own model, key, token ceiling and
structured-output setting. One is active; switch from `/settings/ai` or from the
picker in the app header when a quota runs out or a task needs the other model.
The environment variables below describe the first provider, the one a fresh
deployment starts with.

| Variable | Default | Purpose |
|---|---|---|
| `DOCYFIER_LLM_BASE_URL` | `http://localhost:1234/v1` | OpenAI-compatible endpoint |
| `DOCYFIER_LLM_MODEL` | first model on the server | Model id |
| `DOCYFIER_LLM_API_KEY` | — | Key for providers that require one |
| `DOCYFIER_LLM_MAX_TOKENS` | `32768` | Max tokens per response |

Every credential entered in Settings — LLM API keys, the database password, and
any export option a target declares `secret` — is stored **encrypted**
(AES-256-GCM) in `settings.json` and never sent back to the browser: an empty
password field means "keep the stored one". Set `DOCYFIER_SECRET_KEY` to 32
bytes of hex or base64 (`openssl rand -hex 32`) to control the encryption key;
without it, `secret.key` is generated next to `settings.json` and belongs to
your backups — lose it and the credentials have to be entered again.

Every AI response is validated against the editor schema server-side (invalid
output gets one retry) before it can touch a document.

### Storage

| Backend | Where | Notes |
|---|---|---|
| Files *(default)* | JSON files under `data/documents/` | Override with `DOCYFIER_DATA_DIR` |
| PostgreSQL | `documents` table | Needs an existing database; the table is created on first connection |
| MySQL | `documents` table | Same |

Connection settings always stay in `settings.json` — they cannot live in the
database they configure. The password is encrypted there like every other
credential. Saving a database configuration is refused if the
connection fails, so a typo cannot take the app down. After switching, **Import
documents from files** copies what is still on disk into the database, skipping
ids already present and never deleting the source files.

| Variable | Default | Purpose |
|---|---|---|
| `DOCYFIER_DB_DRIVER` | `files` | `files`, `postgres` or `mysql` |
| `DOCYFIER_DB_HOST` | `localhost` | Database host |
| `DOCYFIER_DB_PORT` | `5432` / `3306` | Defaults to the driver's port |
| `DOCYFIER_DB_USER` | — | Database user |
| `DOCYFIER_DB_PASSWORD` | — | Database password |
| `DOCYFIER_DB_NAME` | — | Database name |
| `DOCYFIER_DB_SSL` | `0` | `1` connects over TLS (certificates verified) |

### Access control

Docyfier is currently **single-user**: one password guarding the instance, off
by default and enabled as soon as a password exists. Multi-tenant access is on
the roadmap, not in the build — do not expose an instance to the open internet
expecting per-user isolation.

| Variable | Default | Purpose |
|---|---|---|
| `DOCYFIER_AUTH` | auto | On as soon as a password exists; `1` forces the setup form on first visit, `0` forces it off |
| `DOCYFIER_AUTH_PASSWORD` | — | Sets the password from the environment instead of the setup form |
| `DOCYFIER_AUTH_SECRET` | derived | Session signing key; without it one is derived and kept with the data |

## Deployment

The `Dockerfile` builds a small runtime image: dependencies and the Next.js
build happen in throwaway stages, and only the `output: "standalone"` server
bundle reaches the final layer. It runs as a non-root user on port `3000` and
exposes a single volume, `/data`, holding documents, uploads and settings —
everything that must survive an image upgrade.

```bash
just docker-build    # docker build -t docyfier:latest .
```

### Published images

`.github/workflows/docker.yml` publishes to the GitHub Container Registry as
`ghcr.io/<owner>/docyfier`. It runs on **version tags only** — pushing `v0.2.0`
yields `0.2.0`, `0.2`, `latest` and the short commit sha — because a tag is the
signal that a build is meant to be deployed. `workflow_dispatch` covers the
occasional build from a branch. The workflow authenticates with the
repository's own `GITHUB_TOKEN`, so a fork needs no configuration.

A host pulling a private image needs a personal access token with the
`read:packages` scope:

```bash
docker login ghcr.io -u <github-user> --password-stdin
```

### Running it

`compose.yaml` is a ready deployment stack. Point the volume at a directory on
the host, keep secrets in a `.env` file beside it (never commit it), then:

```bash
docker compose pull && docker compose up -d
```

Pin `image:` to a release tag rather than `latest`, so a broken build cannot
reach the host on the next pull. Upgrading is `pull` + `up -d`; the `/data`
volume carries over untouched.

One recurring trap: `DOCYFIER_LLM_BASE_URL` must name a host the *container*
can reach. A model server on the machine running Docker is not `localhost` from
inside the container — use its LAN address, and make sure the server listens on
`0.0.0.0` rather than loopback.

## Development

| Command | Purpose |
|---|---|
| `just setup` | Install dependencies |
| `just dev` | Dev server with hot reload |
| `just build` | Production build |
| `just start` | Serve the production build |
| `just serve` | build + start |
| `just check` | typecheck + lint |
| `just docker-build` | Build the Docker image |
| `just clean` | Remove `.next` |

Ports are overridable: `just dev 4000`. Each recipe maps to an npm script, so
`just` is a convenience, not a requirement.

### Project layout

- `src/components/Editor.tsx` — Tiptap editor, toolbar, autosave.
- `src/components/extensions/` — custom nodes (callouts, charts, cards…).
- `src/components/AiPanel.tsx` / `SelectionAiMenu.tsx` / `GenerateHero.tsx` —
  the three AI surfaces.
- `src/lib/ai/` — provider, prompts, schema validation, services.
- `src/lib/store/` — document store: facade + files / PostgreSQL / MySQL drivers.
- `src/infrastructure/publishing/targets/` — export targets, one adapter each,
  listed in `src/lib/export/registry.ts`.
- `src/infrastructure/rendering/` — the document renderers: HTML, Markdown,
  Jira, plain text.
- `src/domain/composing/composers/` — email and ticket composers, same plugin
  shape.
- `src/domain/documents/` / `src/domain/authoring/` — the document rules with no
  I/O in them: chart data, accepted import files, the deterministic formatter,
  the block diff behind AI review.
- `src/lib/import.ts` — file import, over the conversion adapters in
  `src/infrastructure/documents/`.
- `src/app/actions.ts` / `ai-actions.ts` — server actions.
- `src/app/globals.css` — design system, editor chrome, A4 print rules.

Adding an export target or a composer means writing one file and registering
it; that is the intended extension point.

## Roadmap

Shipped so far: the editor, the AI surfaces, themes, templates, import/export,
the composers, and single-user auth. Next up: multi-tenant workspaces with
per-user permissions, corporate themes and style settings (automatic emphasis
rules, emoji policy), diagrams, and print-quality PDF through headless
Chromium — today's PDF goes through the browser print dialog on purpose.

[PLAN.md](PLAN.md) holds the ordered roadmap; [docs/vision.md](docs/vision.md)
holds the product intent behind it.

## License

[GNU AGPL-3.0-only](LICENSE). Use it, modify it, self-host it freely. The one
obligation that matters: if you run a modified version as a network service,
its users are entitled to your source.

## Contributing

Issues and pull requests are welcome. Conventions: all artifacts in English
(code, comments, docs, commit messages), [Conventional
Commits](https://www.conventionalcommits.org/) for messages, and small focused
diffs — one concern per commit. Run `just check` before opening a PR.
