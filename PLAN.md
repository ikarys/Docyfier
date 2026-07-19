# Docyfier — Plan

Roadmap derived from [vision.md](vision.md). Priorities below **challenge** the
original P\* where justified; the "Was → Now" column tracks every change.

**MVP = STEPS 0–4.** Everything after is post-MVP.

## Part A — Prioritized needs

| # | Need (from vision.md) | Was | Now | Rationale for change |
|---|---|---|---|---|
| 1 | AI-assisted writing & formatting for professional environments | P0 | P0 | Core value |
| 2 | Modern, intuitive web UI usable by non-technical users | P0 | P0 | Core value |
| 3 | AI writing help: generation, summaries, rephrasing | P0 | P0 | Core value |
| 4 | Modern, polished formatting: tables, columns, headers, colors, callouts | P0 | P0 | Core differentiator |
| 5 | Charts & diagrams blocks | P0 (implicit in #4) | **P1** | Split out: a large sub-project; MVP ships text/table/layout formatting first |
| 6 | Quick retouches / fast edits of generated content | P0 | P0 | Core value; trust requires easy correction |
| 7 | Export Markdown + PDF | P1 | **P0** | Without export, documents are trapped in the tool; PDF is the #1 professional sharing format |
| 8 | Export docx, slides, Confluence | P1 | P1 | Post-MVP; docx/slides fidelity is genuinely hard |
| 9 | Import existing documents to rework/reformat | P1 | P1 | First post-MVP step: "reformat my ugly doc" is a killer demo |
| 10 | Project/team management, collaboration, change tracking | P0 | **P1** | Heavy; not needed to validate core value — MVP is mono-user (decided) |
| 11 | Organizations, users, access levels & permissions | P0 | **P1** | Same reasoning; designed post-MVP as one coherent multi-tenant step |
| 12 | Bring-your-own LLM per org/team | P0 | **P1** | Org-level config UI is post-MVP; **mitigation:** LLM provider abstraction built day 1 so this stays cheap |
| 13 | Email writing/rephrasing section with tone choices | P1 | P1 | Quick win on top of the same AI engine |
| 14 | Ticket writing section (Jira, ServiceNow, GitLab issues…) | P1 | P1 | Same |
| 15 | Style parameters: emoji on/off, auto-bold keywords, colors… | P2 | **P1** | Cheap once the AI pipeline exists; high perceived value for "professional tone" positioning |
| 16 | Templates per document type (reports, presentations, articles…) | P2 | P2 | |
| 17 | Custom styles & themes for corporate visual identity | P2 | P2 | |
| 18 | Cloud storage integration (Drive, Dropbox, OneDrive…) | P2 | P2 | |
| 19 | Advanced search across documents | P2 | P2 | |
| 20 | Version history / rollback | P3 | **P2** | Near-free if documents are stored as structured snapshots — storage model chosen accordingly in STEP 0 |
| 21 | Read/create/update (no delete) on Confluence, Jira, Notion, Drive with enterprise permission inheritance | P3 | P3 | |

## Part B — Roadmap STEPS

### STEP 0 — Foundations *(decisions + scaffold, no feature code)*

**Goal:** lock the technical base so later STEPS never rework it.

- Validate the stack proposal:
  - Next.js + TypeScript + Tailwind + shadcn/ui (modern UI, fast iteration)
  - Tiptap (ProseMirror) block editor (rich structured editing)
  - PostgreSQL (documents, later orgs/users)
  - Vercel AI SDK as the LLM abstraction — provider-agnostic day 1, keeps
    BYO-LLM (#12) cheap later
  - PDF export via headless Chromium rendering of the styled document
- Key decision: **internal document format = structured JSON (ProseMirror
  schema), not raw markdown.** Enables reliable formatting, targeted AI edits,
  cheap snapshots for future versioning (#20), and multi-format export.
- Scaffold repo, CI, linting.

**Out of scope:** any feature.
**Exit criteria:** stack validated by maintainer; empty app builds and deploys; ADRs written for document format and LLM abstraction.

### STEP 1 — MVP: editor core

**Goal:** manual editing feels great before AI touches it.

- Block-based editor: headings, paragraphs, lists, tables, columns, callouts,
  colors, cover/header blocks.
- Formatting palette designed for professional documents (needs #2, #4, #6).

**Out of scope:** AI, persistence, export, charts.
**Exit criteria:** a polished document can be composed entirely by hand in the browser.

### STEP 2 — MVP: AI assistance

**Goal:** the product's reason to exist — AI that writes *and formats*, directly
inside the WYSIWYG editor.

Three AI surfaces, all producing **schema-valid ProseMirror JSON** injected into
the editor (never markdown, never a separate render):

1. **Prompt-to-document (entry point).** New document starts from a prompt; the
   AI generates a fully formatted document (headings, tables, callouts) loaded
   straight into the editor (#1, #3, #4). Blank document remains available.
2. **Global prompt (side panel).** Chat-style panel for whole-document
   operations: "add a conclusion", "shorten", "more formal tone" (#3).
   Includes the signature **"make it pretty"** restructuring action.
3. **Selection-scoped (bubble menu).** Select a sentence/paragraph → floating
   menu with quick actions (rephrase, shorten, expand, tone) plus a free
   prompt applied **only** to the selection; AI output replaces the selected
   range in place (#3, #6).

Technical decisions:

- AI output = structured output constrained to the Tiptap schema (same node
  types as the editor extensions). Validated server-side (`Node.fromJSON`)
  before injection; invalid output → retry, never a broken editor.
- All LLM calls through the STEP 0 abstraction (Vercel AI SDK).

**Out of scope:** style parameters (#15), dedicated email/ticket flows.
**Exit criteria:** prompt → formatted document appears in the editor; a selection can be rewritten via prompt without touching the rest; every AI output is editable in place.

### STEP 2b — MVP: themes (basic)

**Goal:** shape the look of a document independently of its content.

- **Content/theme separation:** document = ProseMirror JSON (content) + theme
  reference (presentation). Switching theme never touches content — enables
  clean exports, future versioning, corporate themes later (#17, #20).
- A few built-in theme presets (e.g. corporate / modern / minimal) applied as
  a CSS layer; theme picker in the editor.

**Out of scope:** custom/org themes (#17), style parameters (#15) — advanced
theming stays in STEP 9.
**Exit criteria:** the same document renders (and prints) under at least two visibly distinct themes with zero content change.

### STEP 3 — MVP: export

**Goal:** documents leave the tool (#7).

- Markdown export (from the structured format).
- PDF export with print-quality rendering of the styled document.

**Out of scope:** docx, slides, Confluence (#8).
**Exit criteria:** exported PDF is visually faithful to the in-app document; markdown round-trips the content.

### STEP 4 — MVP: persistence + simple auth

**Goal:** a real, deployable mono-user product.

- Document list, save/load, autosave.
- Single-user authentication (no orgs, no roles).

**Out of scope:** multi-tenant anything (#10, #11).
**Exit criteria:** **MVP complete** — a user signs in, creates, formats, saves, and exports documents on a deployed instance.

### STEP 5 — Import & more exports

- Import docx/markdown to reformat ("beautify my existing doc") (#9).
- Export docx (#8, partial).

**Exit criteria:** an imported docx can be beautified and re-exported.

### STEP 6 — Multi-tenant

- Organizations, users, roles & permissions (#11).
- Projects/teams, sharing, change tracking (#10).
- Real-time collaborative editing deferred until demanded.

**Exit criteria:** two orgs coexist with isolated documents and per-role access.

### STEP 7 — BYO LLM

- Per-org provider/model/API-key configuration on top of the STEP 0 abstraction (#12).

**Exit criteria:** an org admin switches provider without code changes.

### STEP 8 — Dedicated flows

- Email composer with tone choices (#13).
- Ticket composer with per-tool formats: Jira, ServiceNow, GitLab issues (#14).

**Exit criteria:** both flows produce ready-to-paste output.

### STEP 9 — Templates, themes, style settings

- Document templates per type (#16).
- Corporate themes/styles (#17) — building on the STEP 2b content/theme
  separation and built-in presets.
- Style parameters: emoji, auto-bold keywords, colors (#15).

**Exit criteria:** a new document from a template inherits the org theme and style settings.

### STEP 10 — Integrations & maturity

- Cloud storage (#18); Confluence/Jira/Notion/Drive read-create-update, no
  delete, enterprise permission inheritance (#21).
- Version history UI (#20); advanced search (#19).
- Charts & diagrams blocks (#5) — may be pulled earlier if demand shows up.

**Exit criteria:** per integration: connect, list, import, push update without leaving the app.
