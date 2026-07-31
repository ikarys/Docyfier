# Docyfier — Plan

Roadmap derived from [docs/vision.md](docs/vision.md). Priorities below **challenge** the
original P\* where justified; the "Was → Now" column tracks every change.

**MVP = STEPS 0–4.** Everything after is post-MVP.

The UX & rendering upgrade STEPS **U1–U7** ([Part C](#part-c--ux--rendering-upgrade-steps-u1u14))
slot **between STEP 2b and STEP 3**. Recommended order: U1 → U4 → U3 → U2 → U5 → U6 → U7.
The editing STEPS **U8–U14** continue Part C and run **before STEP 6**:
U8 → U9 → U10 → U11 → U13 → U14 → U12. **U14 comes before U12**: speed is a
P0 need (#6b), and comments on a document nobody edits are worth nothing.

## Part A — Prioritized needs

| # | Need (from docs/vision.md) | Was | Now | Rationale for change |
|---|---|---|---|---|
| 1 | AI-assisted writing & formatting for professional environments | P0 | P0 | Core value |
| 2 | Modern, intuitive web UI usable by non-technical users | P0 | P0 | Core value |
| 3 | AI writing help: generation, summaries, rephrasing | P0 | P0 | Core value |
| 4 | Modern, polished formatting: tables, columns, headers, colors, callouts | P0 | P0 | Core differentiator |
| 5 | Charts & diagrams blocks | P0 (implicit in #4) | **P1** | Split out: a large sub-project; MVP ships text/table/layout formatting first. Charts landed in [STEP U6](#step-u6--data-viz-blocks--rich-cover), diagrams in [STEP 10](#step-10--integrations--maturity). **Done** |
| 6 | Quick retouches / fast edits of generated content | P0 | P0 | Core value; trust requires easy correction |
| 6b | AI answers fast enough to stay in the writer's hands | — | **P0** | Added by the maintainer after measuring: a rewrite that takes twenty seconds is not a slow feature, it is one nobody uses. Every AI surface owes a latency budget, and a change that misses it is not done. [STEP U14](#step-u14--the-cost-of-one-ai-call) |
| 7 | Export Markdown + PDF | P1 | **P0** | Without export, documents are trapped in the tool; PDF is the #1 professional sharing format |
| 8 | Export docx, slides, Confluence | P1 | P1 | Post-MVP; docx/slides fidelity is genuinely hard |
| 9 | Import existing documents to rework/reformat | P1 | P1 | First post-MVP step: "reformat my ugly doc" is a killer demo |
| 10 | Project/team management, collaboration, change tracking | P0 | **P1** | Heavy; not needed to validate core value — MVP is mono-user (decided). Change tracking split out into [STEP U12](#step-u12--comments-suggestions--history), which works mono-user and hands STEP 6 real identities |
| 11 | Organizations, users, access levels & permissions | P0 | **P1** | Same reasoning; designed post-MVP as one coherent multi-tenant step |
| 12 | Bring-your-own LLM per org/team | P0 | **P1** | Org-level config UI is post-MVP; **mitigation:** LLM provider abstraction built day 1 so this stays cheap |
| 13 | Email writing/rephrasing section with tone choices | P1 | P1 | Quick win on top of the same AI engine |
| 14 | Ticket writing section (Jira, ServiceNow, GitLab issues…) | P1 | P1 | Same |
| 15 | Style parameters: emoji on/off, auto-bold keywords, colors… | P2 | **P1** | Cheap once the AI pipeline exists; high perceived value for "professional tone" positioning |
| 16 | Templates per document type (reports, presentations, articles…) | P2 | P2 | |
| 17 | Custom styles & themes for corporate visual identity | P2 | P2 | |
| 18 | Cloud storage integration (Drive, Dropbox, OneDrive…) | P2 | P2 | |
| 19 | Advanced search across documents | P2 | P2 | |
| 20 | Version history / rollback | P3 | **P2** | Near-free if documents are stored as structured snapshots — storage model chosen accordingly in STEP 0. Delivered in [STEP U12](#step-u12--comments-suggestions--history) |
| 21 | Read/create/update (no delete) on Confluence, Jira, Notion, Drive with enterprise permission inheritance | P3 | P3 | |

## Part B — Roadmap STEPS

### STEP 0 — Foundations *(decisions + scaffold, no feature code)*

**Goal:** lock the technical base so later STEPS never rework it.

- Validate the stack proposal:
  - Next.js + TypeScript + Tailwind + shadcn/ui (modern UI, fast iteration)
  - Tiptap (ProseMirror) block editor (rich structured editing)
  - PostgreSQL (documents, later orgs/users) — MySQL is supported as an
    alternative from STEP 4; the storage backend is selectable at runtime
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

Acceptance:

- [x] Markdown export downloads a `.md` file for the open document (headings, lists, tables, code, quotes, links, GitHub-style callout alerts)
- [x] Rich blocks project onto standard markdown instead of vanishing — a chart exports as the table of its own data, a statRow as a list of figures
- [x] Round-trip: exporting the seven templates to markdown and re-importing them loses no content word
- [ ] PDF export via headless Chromium, visually faithful, with page numbers in the footer

### STEP 4 — MVP: persistence + simple auth

**Goal:** a real, deployable mono-user product.

- Document list, save/load, autosave.
- **Selectable storage backend:** the file store that stood in for the database
  since STEP 0 becomes one driver among three — files (default), PostgreSQL,
  MySQL — chosen from the Settings page, no rebuild. Connection settings stay
  file-backed: they cannot live in the database they configure.
- **Explicit import** of file-backed documents into the chosen database
  (skip-if-present, never destructive), so switching driver does not hide
  existing work.
- Single-user authentication (no orgs, no roles). **Opt-in:** a local run stays
  open until credentials exist, so trying the app never starts with inventing a
  password. A deployment turns it on with an environment variable.

**Out of scope:** multi-tenant anything (#10, #11); schema migration tooling —
the single `documents` table is created idempotently on connect.
**Exit criteria:** **MVP complete** — a user signs in, creates, formats, saves, and exports documents on a deployed instance.

Acceptance (auth half):

- [x] One password guards the instance; it is chosen on first run or set by `DOCYFIER_AUTH_PASSWORD`
- [x] Credentials live in an owner-only `auth.json` beside the settings, never in the document store — a database configured from inside the app cannot hold the secret protecting it
- [x] Sessions are a signed expiry in an httpOnly cookie: no session table before STEP 6, and rotating the password kills every session
- [x] Pages, server actions and API routes are all guarded; an unauthenticated API call gets 401, a page redirect
- [x] Auth is off until credentials exist; `DOCYFIER_AUTH=1` forces it on, `DOCYFIER_AUTH=0` off
- [x] Repeated wrong passwords lock login attempts for a few minutes

### STEP 5 — Import & more exports

- Import markdown, plain text and docx to reformat ("beautify my existing doc")
  (#9). One conversion path for every format: source → HTML → ProseMirror JSON
  parsed with the editor's own schema (`src/lib/import.ts`). The import is
  faithful — structure only; the AI "make it pretty" pass is what reformats.
- Export docx (#8, partial).
- **Export targets as plugins:** Word, Confluence, Notion, Trilium (#8). One contract,
  one adapter per target (`src/infrastructure/publishing/targets/`), each enabled from the Settings
  page. Payload only — the user copies it or downloads it; no API integration, so
  a target costs nothing to add and needs no credentials for a tool this instance
  may not even reach.

**Out of scope:** PDF import — a PDF carries layout, not structure; recovering
a document model from it is a project of its own, not a file reader. API-driven
publishing to those tools: it needs per-tool auth and a page-identity model,
which is STEP 6 territory.
**Exit criteria:** an imported docx can be beautified and re-exported.

Acceptance (import half):

- [x] `.md`, `.markdown`, `.txt` and `.docx` import into an editable document; headings, lists, tables, code blocks, quotes and inline marks survive
- [x] A `.txt` file is never interpreted as markdown
- [x] Images in the source are dropped (an imported `src` would point at a file this instance does not serve); headings deeper than 3 collapse onto 3
- [x] An unsupported extension or an oversized file is refused with a message, and no document is created
- [x] docx export: real Word heading styles, bulleted and numbered lists, bordered tables, page number in the footer, A4 or Letter
- [x] Blocks Word has no equivalent for keep their content — a callout becomes a shaded one-cell table, a chart the table of its own data
- [ ] Images are exported as a captioned link, not embedded: their bytes sit behind `/api/uploads` and a target is a pure function of the document

Acceptance (export targets):

- [x] A target declares its own options; Settings renders them and stores them per target, without knowing what any target is
- [x] Only enabled targets are offered on a document, and a disabled target is unreachable by URL (404, same answer as unknown)
- [x] Confluence exports rich HTML for paste, or storage format with `ac:` macros (panels, code, toc) for a Data Center source editor
- [x] Notion exports markdown — the format its paste handler reads; Trilium exports the HTML a text note stores natively
- [x] Every payload can be copied from the page or downloaded as a file; a binary target (Word) offers the download alone
- [x] Images export as absolute URLs once the public URL of the instance is set; without it they stay relative and only resolve from inside

### STEP 6 — Multi-tenant

- Organizations, users, roles & permissions (#11).
- Projects/teams, sharing, change tracking (#10).
- Real-time collaborative editing deferred until demanded.

**Exit criteria:** two orgs coexist with isolated documents and per-role access.

### STEP 7 — BYO LLM

- Per-org provider/model/API-key configuration on top of the STEP 0 abstraction (#12).
- Done ahead of the STEP, instance-wide: several providers are configured in
  Settings, the active one is switched from the header, and API keys are
  encrypted at rest. What remains here is scoping that list per org (STEP 6).

**Exit criteria:** an org admin switches provider without code changes.

### STEP 8 — Dedicated flows

- Email composer with tone choices (#13).
- Ticket composer with per-tool formats: Jira, ServiceNow, GitLab issues (#14).

**Composers as plugins:** one contract, one file per flow
(`src/domain/composing/composers/`). A composer declares its form fields and builds
its prompt from them, and does nothing else — no AI client, no storage. The
form, the menu and the server action all read the registry, so a new flow is a
file plus a line.

**Out of scope:** posting to the tracker or sending the mail. These flows end at
the clipboard for the same reason exports do: delivery needs per-tool auth,
which is STEP 6/10 territory. Composed text does not become a document either —
that is what the document surfaces are for.

**Exit criteria:** both flows produce ready-to-paste output.

Acceptance:

- [x] Email: brief → email, or an existing email rewritten; tone, length, recipient and language are choices, and the subject line comes out first
- [x] Ticket: raw notes → title plus description, in the markup the chosen tracker reads — Jira wiki markup, ServiceNow plain-text fields, GitLab flavored markdown
- [x] One ticket composer, not three: the tracker is a field, so the questions asked of the user stay the same and each format is one entry
- [x] Output is plain text with a copy button; the form keeps its values so one choice can be changed and composed again
- [x] Composers invent nothing the input does not carry — missing facts come out as bracketed placeholders
- [x] A `select` only ever yields a declared choice, and unknown form keys are never read: the values reach a prompt
- [x] Pages and the action are guarded like the rest — auth on gives a redirect to `/login`, auth off lets them through

### STEP 9 — Templates, themes, style settings

- Document templates per type (#16) — shipped in [STEP U5](#step-u5--templates--home-polish).
- Corporate themes/styles (#17) — building on the STEP 2b content/theme
  separation and built-in presets.
- Style parameters: emoji, auto-bold keywords, colors (#15).

**The instance is the tenant.** Orgs are STEP 6; until then "the org theme" is
the instance's, held in one `Brand` beside the other settings scopes: the dress
new documents start in, plus the presets this instance saved for itself. Colors
are not a style parameter — they are the theme, which is what #15 meant by them.

**Saved presets are referenced, not copied.** A document stores the preset id;
editing the house accent repaints every document wearing it, which is the point
of a corporate identity. The cost is a preset that can outlive its documents, so
resolution falls back to the default rather than failing.

**The brand is a default, not an override.** A template keeps the preset it
suggests and a generated document keeps the art direction its plan chose
(STEP U7); the brand dresses everything nobody else dressed.

**Out of scope:** per-org scoping of any of it (STEP 6), and a preset the model
may pick from — the art vocabulary stays the four built-ins.

**Exit criteria:** a new document inherits the instance theme and style settings.

Acceptance:

- [ ] A blank or imported document opens in the theme set in Settings → Style; a document from a template still opens in the template's preset
- [ ] Tokens saved as a named preset appear beside the four built-ins in the Design panel and in the toolbar picker
- [ ] Editing a saved preset restyles the documents wearing it, with zero content change; removing it leaves them rendering on the default
- [ ] Emoji off removes emoji from generated documents even when the model sends them anyway; emoji on lets them through
- [ ] A named writing language wins over the language the planning pass chose
- [ ] A settings file edited by hand into nonsense still opens the Style page, with every field fallen back

### STEP 10 — Integrations & maturity

- Cloud storage (#18); Confluence/Jira/Notion/Drive read-create-update, no
  delete, enterprise permission inheritance (#21).
- Version history UI (#20); advanced search (#19).
- ~~Diagrams blocks (#5, the flow/architecture half)~~ — **done**, ahead of the
  rest of this STEP, at the maintainer's call. Charts were pulled forward into
  [STEP U6](#step-u6--data-viz-blocks--rich-cover); the diagram block copies
  their shape exactly.

  Five kinds — flow, architecture, sequence, hierarchy, phase axis — as one
  atom node whose attrs are the graph. Three decisions carry the rest:

  - **Meaning, never coordinates.** The AI and the panel declare nodes, edges
    and groups; `domain/documents/diagram/layout/` computes where every box
    lands. Nothing can be dragged, so nothing can be dragged out of place, and
    a model that cannot place a diagram well never has to.
  - **No layout library and no mermaid.** The mermaid rejection recorded in
    STEP U6 stands: async render, rigid grammar, unvalidatable. The four
    families have regular geometry, so ~600 lines of pure maths replace a
    general graph-layout dependency — and the tests pin what makes the drawings
    trustworthy (no overlap, nothing off-canvas, orthogonal edges, determinism)
    rather than how they are computed.
  - **One scene, two emitters.** The editor paints theme tokens; the export
    path paints literal values, because librsvg — `sharp`'s renderer — resolves
    no CSS variable, no `currentColor` and no web font. `sharp` is promoted to
    a declared dependency for that: it rasterises a figure without the headless
    Chromium this plan decided not to carry.

  Where it lands per target: HTML and print get the inline SVG, Word an
  embedded PNG, Confluence rich HTML and Trilium a `data:` PNG. Confluence
  storage format and Notion get the relations in words — storage models images
  as attachments that must already exist on the page, and Notion's payload is
  markdown. That is a limit of those targets, not an omission.

**Exit criteria:** per integration: connect, list, import, push update without leaving the app.

## Part C — UX & rendering upgrade STEPS (U1–U14)

Motivation: the current editor produces correct but classic documents; the UX is
toolbar-only; themes are four fixed presets; whole-document AI transforms are
slow and token-hungry. These STEPS modernize the editing UX (U1), make AI fast
and safe (U4), make themes customizable (U3), enrich rendering (U2), add
templates (U5), add data-viz blocks (U6) and put the theme and the shape of a
generated document in the model's hands (U7). They slot between STEP 2b and
STEP 3 and pull parts of STEP 9 and STEP 10 forward.
Recommended order: **U1 → U4 → U3 → U2 → U5 → U6 → U7**.

U1–U7 delivered a rich palette of layout blocks. **U8–U12** close the gap
between that palette and what a document editor is expected to do around it in
2026: find and replace, paste from anywhere, checkboxes and collapsible
sections, images that behave like figures, AI at the caret, and a record of who
changed what. They run **after U7 and before STEP 6**, in the order
**U8 → U9 → U10 → U11 → U12**.

### Ground rules for implementers (read before any U-STEP)

- Read [AGENTS.md](AGENTS.md), then these files before writing code:
  `src/components/Editor.tsx`, `src/infrastructure/editor/cards.ts` (the
  canonical custom-node pattern — copy its structure for any new node),
  `src/domain/authoring/prompts.ts`, `src/infrastructure/editor/schema.ts`, `src/lib/ai/service.ts`,
  `src/lib/store.ts`, `src/lib/themes.ts`, `src/app/globals.css`.
- Stack: Next.js 15 (App Router + server actions), Tiptap v3, Vercel AI SDK v7,
  Tailwind v4. Documents are ProseMirror JSON on disk via `src/lib/store.ts`.
- **Every new node type is registered in two places**: the document's
  extensions (`src/infrastructure/editor/document-extensions.ts`), which the
  editor and the validation schema share, and the AI format contract
  (`src/domain/authoring/prompts/format-contract.ts`) — a node missing from the
  contract is never produced, one missing from the extensions fails validation.
  Everything else is *recommended*, not required, because an unknown type
  degrades to its children rather than disappearing: an entry in the HTML and
  Markdown renderers (`src/infrastructure/rendering/{html,markdown}/blocks.ts`,
  from which Notion and Trilium inherit for free), a case in the Word target
  (`src/infrastructure/publishing/targets/docx/blocks.ts`, its own render tree),
  a line in the print `break-inside: avoid` list, and — when the block carries
  rules of its own — attribute validation in `schema.ts` the way `chart` has it.
  Jira and plain text are optional. `ops.ts`, the document body model and the
  export registry never change for a node type.
- No new UI libraries without maintainer approval — plain React + CSS in
  `globals.css`, matching the existing code. Tiptap official extensions are fine.
- Small diffs, Conventional Commits, one concern per commit. Verify each
  acceptance box manually in the browser (including print preview) before
  checking it.

### STEP U1 — Modern editor UX (slash menu, drag handles)

**Goal:** compose a rich document without hunting through a toolbar — Notion-grade ergonomics.

Instructions:

1. **Slash menu.** Add `@tiptap/suggestion`. New files:
   `src/components/extensions/SlashCommand.ts` (extension wrapping the
   Suggestion plugin, trigger char `/`) and `src/components/SlashMenu.tsx`
   (popup). Items: every insertable block currently in the toolbar — H1–H3,
   bullet/ordered list, quote, code block, table, callout (one item per
   variant), cards, columns, stats, timeline, steps, pyramid, divider. Each
   item: `label`, `keywords` (English + French synonyms), text/emoji icon, and
   `command({ editor, range })` that deletes the typed range then runs the same
   chain the toolbar buttons use today. Filtering: case-insensitive match on
   label or keywords. Popup: absolutely positioned React list anchored on
   `editor.view.coordsAtPos(...)`; ↑/↓ to select, Enter to apply, Esc to close.
   No tippy/floating-ui dependency.
2. **Drag handles.** Use `@tiptap/extension-drag-handle-react` (open source in
   v3). On hover of a **top-level** block show `⋮⋮` (drag to reorder) and `+`
   (opens the slash menu to insert below). Restrict dragging to top-level nodes;
   do not allow dropping a layout block inside another layout block (the schema
   already forbids it — verify the drop is rejected cleanly, not half-applied).
3. **Formatting bubble menu.** Extend `SelectionAiMenu.tsx` (same positioning
   logic) with a formatting row: bold, italic, strike, inline code, badge
   toggle, a small set of text-color swatches, highlight swatches. AI actions
   stay as they are.
4. **Toolbar cleanup.** Remove from `MenuBar` the groups that moved into `/`
   (table insert, cards, cols, stats, timeline, steps, pyramid, callout
   swatches). Keep: undo/redo, theme select, Assistant toggle, save status.
   Table row/column editing buttons may move into a small contextual popup
   shown only when the caret is inside a table.
5. **Shortcut help.** A `?` toolbar button opens a static overlay listing the
   keyboard shortcuts (Tiptap defaults + `/`).

Acceptance:

- [ ] Typing `/` in an empty paragraph opens the menu; `/tim` filters to Timeline; Enter inserts it
- [ ] Every block insertable from the old toolbar is insertable via `/` (parity checklist against the current `MenuBar`)
- [ ] A top-level block can be dragged above/below another; dropping a card grid inside a card is cleanly refused
- [ ] Selection shows the formatting row; bold + badge apply from it
- [ ] Toolbar no longer contains block-insert buttons; nothing else regressed (undo/redo, theme, save states)

### STEP U4 — Fast, safe AI (streaming, targeted transforms, diff preview)

**Goal:** AI feels instant and never destroys content silently.

Instructions:

1. **Streaming prompt-to-document.** New route handler
   `src/app/api/generate/route.ts`: uses `streamText` (AI SDK v7) with the
   existing `GENERATE_SYSTEM`. Server incrementally parses the accumulating
   output: track brace depth + string/escape state; every time a top-level
   object inside the root `"content"` array closes, validate that single block
   (wrap it in `{type:"doc",content:[block]}` → `validateDocJson`) and emit it
   as one NDJSON line. Flow change: the home hero creates an **empty** document,
   redirects to the editor, and the editor page streams blocks in, appending
   each to the document with a skeleton placeholder until the first block
   arrives. Keep the current non-streaming server action as fallback when the
   provider rejects streaming.
2. **Targeted whole-document transforms.** Replace the "resend the full doc,
   get the full doc back" contract of surface 2. New prompt in
   `src/domain/authoring/prompts.ts`: input = the document as a numbered list of
   top-level blocks (`index` + JSON); output = a JSON **array of ops**:
   `{"op":"replace","index":n,"blocks":[...]}`,
   `{"op":"insert_after","index":n,"blocks":[...]}`,
   `{"op":"delete","index":n}`. In `service.ts` validate each op's blocks with
   the existing schema; reject unknown ops or out-of-range indexes. Client
   applies ops **from highest index to lowest** so earlier indexes stay valid.
   Fallback: if the model returns a full doc object instead of an array, treat
   it as a whole-document replace (current behavior).
3. **Diff preview with accept/reject.** Before applying AI output (surfaces 1
   fallback, 2, and 3a): snapshot `editor.getJSON()`, apply the change, mark
   changed/inserted top-level blocks (compare by deep equality against the
   snapshot) with a visual marker (colored left border via a decoration or a
   temporary node attribute), and show a floating bar: **Accept all** (clear
   markers, save) / **Reject** (restore the snapshot exactly). v1 is global
   accept/reject; per-block accept is out of scope.
4. **Structured output.** In `service.ts`, add a settings-gated path using
   `generateObject`/`streamObject` with a permissive JSON schema (root object,
   `type` + `content` required) so providers that support JSON-schema output
   stop producing fences/prose. Keep `extractJson` as the fallback path.

Acceptance:

- [ ] Prompt-to-document: first block visible under ~2 s (local model), blocks appear progressively, final doc identical to non-streaming output for the same seed prompt
- [ ] "Make it pretty" on a 10-page document returns ops, not 10 pages; untouched sections are byte-identical after apply
- [ ] Malformed op (bad index, unknown op, invalid block) → the whole result is rejected with the existing retry, never a partial apply
- [ ] Every AI apply shows changed blocks highlighted + Accept all / Reject; Reject restores the exact prior JSON (deep-equal)
- [ ] Provider without streaming/JSON-schema support still works via fallbacks

### STEP U3 — Customizable themes (tokens, not fixed CSS)

**Goal:** themes become user-adjustable token sets; the four presets are starting points.

Instructions:

1. **Token model.** In `src/lib/themes.ts` define
   `ThemeTokens = { accent: string /* hex */, fontPair: string /* id */, radius: "sharp"|"soft"|"round", density: "compact"|"normal"|"airy" }`
   and `DocumentTheme = { preset: string; overrides?: Partial<ThemeTokens> }`.
   Express the four existing presets as full token sets. Export
   `resolveTokens(theme)` = preset tokens + overrides.
2. **CSS refactor.** In `globals.css`, rewrite the `[data-theme]` blocks so
   everything tokenizable reads CSS variables (`--doc-accent`,
   `--doc-font-heading`, `--doc-font-body`, `--doc-radius`, `--doc-space`).
   The `data-theme` attribute keeps controlling what is not tokenized (e.g.
   heading underline style). The editor sets the variables as inline style on
   `.doc-shell` from `resolveTokens`.
3. **Fonts.** 5–6 curated font pairs (heading + body) loaded via
   `next/font/google` in `layout.tsx`, exposed as CSS variables; `fontPair`
   picks a pair. No runtime font fetching.
4. **Persistence.** `DocumentRecord.theme` becomes `DocumentTheme`.
   `normalizeTheme` must accept the legacy string form (`"corporate"` →
   `{preset:"corporate"}`) and anything unknown → default. Extend
   `setDocumentTheme` / `setDocumentThemeAction` to carry overrides (debounce
   writes client-side like autosave).
5. **Design panel.** A "Design" side panel (sibling of `AiPanel`, same slot,
   toggle in the toolbar): preset cards (click to switch), accent color
   (native `<input type="color">` + a few curated swatches), font pair select,
   density and radius radio groups. All changes apply live via the inline CSS
   variables; content JSON is never touched.

Acceptance:

- [ ] Old documents (string theme) load without error and render as before
- [ ] Preset switch + accent/font/density/radius overrides apply live, survive reload, and never modify `content`
- [ ] The same document prints correctly under customized tokens (print preview check)
- [ ] Unknown preset/garbage overrides on disk → silent fallback to defaults, no crash

### STEP U2 — Rich rendering (images, cover, TOC, print control)

**Goal:** documents stop looking like plain notes — covers, images, TOC, clean pagination.

Instructions:

1. **Images.** Add `@tiptap/extension-image` (block-level, attrs: `src`, `alt`,
   `width` percent). Upload: `POST src/app/api/uploads/route.ts` saving to
   `<data dir>/uploads/<uuid>.<ext>` (reuse the `DOCYFIER_DATA_DIR` convention
   from `store.ts`; validate mime type image/*, cap size ~10 MB);
   `GET /api/uploads/[name]` serves the file with the right content-type and
   an id-format check like `getDocument`. Editor: slash item + paste/drop
   handler that uploads then inserts. Width presets (25/50/75/100%) via a small
   bubble control. The AI contract must state images are **never** emitted by
   the model (no fabricated `src`).
2. **Links, alignment.** StarterKit v3 already bundles Link and Underline —
   configure Link (`openOnClick: false` inside the editor) and surface
   link/underline in the U1 formatting bubble. Add
   `@tiptap/extension-text-align` on heading + paragraph.
3. **Cover block.** New node `docCover` following the `Cards.ts` pattern:
   content = title + optional subtitle + optional meta line (date/author);
   full-bleed themed background (uses U3 tokens). Enforce "first node only" in
   the insert command (not in the schema). Register in all three places.
4. **Table of contents.** New atom node `tableOfContents` with a React NodeView
   that walks the document's headings (debounced on update) and renders a
   clickable list (click → scroll to heading). Stored as a single empty node in
   JSON; the NodeView computes everything. Register in all three places (AI may
   emit it, typically right after the cover/title).
5. **Print control.** `@page` rules (A4, sane margins); `break-inside: avoid`
   on cards, stats, callouts, table rows, timeline items, steps; new trivial
   `pageBreak` node (like `horizontalRule`): dashed line in the editor,
   `break-after: page` and invisible in print. **Page numbers are explicitly
   deferred to STEP 3** (browser print cannot render them reliably; the
   headless-Chromium PDF export will use header/footer templates).

Acceptance:

- [ ] Paste and drag-drop an image → uploaded, persisted, re-rendered after reload; width presets work
- [ ] Cover + TOC + image document prints on 3+ pages with no block cut mid-body and the manual page break honored
- [ ] TOC entries follow heading edits (add/rename/delete) and click-scroll correctly
- [ ] AI "make it pretty" may add cover/TOC but never an image node
- [ ] Links open nothing while editing (`openOnClick: false`) but are clickable in print/preview

### STEP U5 — Templates & home polish

**Goal:** start from something good in three clicks; manage documents like a real product.

Instructions:

1. **Templates.** `src/lib/templates.ts`: `TEMPLATES: { id, label, description,
   preset, content: JSONContent }[]` — 6–8 entries: meeting notes, project
   one-pager, tech spec, status report, roadmap, incident postmortem, decision
   note. Content uses the rich blocks (stats, cards, timeline; cover once U2 is
   done). Each template must pass `validateDocJson` in a build-time or startup
   assertion.
2. **Gallery.** Home "New document" opens a gallery (blank + template cards:
   title, description, small static CSS thumbnail — no live Tiptap render).
   New server action `createFromTemplateAction(templateId)` → `createDocument`
   with the template content + preset theme → redirect to the editor.
3. **Document list.** Add: client-side search filtering on title; inline rename
   (add optional `titleOverride?: string` to `DocumentRecord` — when set it wins
   over `deriveTitle`, and `updateDocument` must stop recomputing the title);
   duplicate (new id, "Copy of …"); delete behind an explicit confirm dialog
   (the `deleteDocument` store function already exists).

Acceptance:

- [x] New doc from template in ≤ 3 clicks; the document opens fully formatted with its suggested theme
- [x] All templates pass schema validation automatically (assertion fails the build if one is broken)
- [x] Search filters as you type; rename sticks after reload and survives content edits; duplicate creates an independent copy
- [x] Delete requires confirmation and cannot be triggered by a single stray click

### STEP U6 — Data-viz blocks & rich cover

**Goal:** a generated report can carry its numbers visually — charts, a magazine
cover, dashboard-grade stat cards — without leaving the block model.

**Why now:** need #5 was parked in STEP 10 "may be pulled earlier if demand shows
up". Reference documents produced by Dust (`app.dust.tt/share/frame/…`) show the
gap is charts, cover and icons — everything else in them (stat rows, numbered
recommendation cards, side-bar callouts, colored inline figures) is already
expressible with the blocks shipped in STEP 2b/U1.

**Non-goal — do not copy Dust's model.** Dust emits an interactive React app
(tabbed frames, live components). Docyfier emits a document: typed blocks,
schema-validated, WYSIWYG-editable, printable. Tabs and generated code are out
of scope; the catalogue of blocks is what grows.

Instructions:

1. **`chart` node.** New `src/components/extensions/Chart.ts`, following the
   `Cards.ts` pattern. `group: "block"`, `atom: true`, `isolating: true` — the
   data lives in attrs, so there is no editable child content to reconcile.
   Attrs: `kind` (`"bar" | "line"`), `categories` (`string[]`), `series`
   (`{ label: string; values: number[] }[]`), `title?`, `caption?`,
   `showGrid` (default `true`), `showLegend` (default `true`).
   Constraints enforced in the node's `addAttributes` parsing **and** mirrored
   in `doc-schema.ts`: 1–4 series, 2–24 categories, every `series.values`
   exactly as long as `categories`, all values finite. Invalid data must fail
   validation so the AI retries instead of rendering a broken chart.
2. **Chart rendering.** React NodeView emitting **inline SVG** — no chart
   library, no canvas. Responsive `viewBox`, series colors taken from the U3
   theme tokens (never hardcoded hex, same rule `beautify.ts` already enforces
   on headings). Axis ticks computed from the data range, rounded to a readable
   step. `break-inside: avoid` in print. Verify in print preview: SVG is exactly
   what makes charts printable, and the acceptance box below is not optional.
3. **Chart editing.** Selecting the block shows a small panel (plain React, in
   `globals.css` style): kind toggle, title/caption fields, and a compact
   editable grid for categories + series values. No drag-to-edit, no live
   resize — typed values only.
4. **AI contract.** `prompts.ts`: the model may emit `chart` **only** from
   figures present in the user's prompt or in the document being transformed —
   never invented data, same spirit as the "no fabricated image `src`" rule in
   U2. Two-column tables whose values are all figures should keep upgrading to
   `statRow` (existing `beautify.ts` rule); a chart is for a series over
   categories, not for 3 KPIs.
5. **Cover enrichment.** Extend the `docCover` node from U2 (do not add a second
   cover node): optional chips row (reuses the `badge` mark styling), optional
   meta line (author · date · reading time). Reading time stays a plain typed
   string — no word-count magic.
6. **Dashboard stat variant.** Extend the existing `stat` node with
   `layout: "grid" | "row"` (default `"grid"`, today's behaviour) and an
   optional `icon`. `"row"` renders the full-width card seen in the reference:
   icon, uppercase label, XXL value, colored delta line driven by the existing
   `trend` attr.
7. **Inline icon set.** `src/lib/icons.ts`: a closed map of ~24 inline SVG paths
   (chart, clock, check, alert, users, target…). Referenced by name from the
   `icon` attrs of `callout`, `card`, `step` and `stat`. Unknown name → no icon,
   never a crash. No icon package.
8. **Dead dependency cleanup.** `mermaid`, `react-markdown`, `rehype-highlight`,
   `rehype-raw` and `remark-gfm` are in `package.json` and imported nowhere in
   `src/`. Remove them in this STEP (mermaid in particular must not be mistaken
   for the charts path — its async render and rigid `xychart` are wrong for
   print and for schema validation).

Reminder: `chart` is a new node type — register it in **all three** places
(`Editor.tsx`, `doc-schema.ts`, `prompts.ts`), per the Part C ground rules.

Acceptance:

- [ ] `/chart` inserts a bar chart with placeholder data; switching to line keeps the data
- [ ] Editing a value in the panel re-renders the SVG and survives reload (attrs persisted)
- [ ] A chart with mismatched series/category lengths is rejected by `validateDocJson` (AI retries, no broken block)
- [ ] Chart colors follow the document theme; switching theme restyles the chart with zero content change
- [ ] Print preview: chart renders at full fidelity and is never split across two pages
- [ ] Cover with chips + meta line, and a `layout: "row"` stat card, match the reference layouts
- [ ] "Make it pretty" on a document containing a figures table adds a chart **only** when the numbers already exist in the document
- [ ] `npm ls` shows the five dead dependencies gone and the app still builds

### STEP U7 — Art direction & document recipes

**Goal:** a generated document arrives already dressed and already shaped like
what it is — a postmortem does not come out looking like a roadmap, and nobody
has to open the Design panel to fix the accent and the font every time.

**Why:** the generation is correct but generic. Three causes, all structural:
the model is never asked to choose the document's theme (a generated document
always gets the default preset, while a document from a template gets the
template's), the style guide forbids it any color of its own (rightly — color
belongs to the theme), and one prompt describing twenty available blocks makes
every document reach for the same five. The fix is not a longer prompt: it is a
planning pass that decides what the document *is* before writing it.

Instructions:

1. **Recipes.** `src/domain/authoring/recipes/`, registry shape (contract file,
   one file per recipe, one registry line — same as export targets and
   composers). Eight kinds: report, one-pager, spec, status, postmortem,
   roadmap, guide, note. A recipe carries a `hint` (what the kind is for, read
   by the planning prompt), a `skeleton` (the block sequence the writer fills)
   and a default `art`.
2. **Planning pass.** `planDocument` use case: one short call returning a
   `DocumentBrief` — kind, audience, tone, language, the section list with the
   block chosen for each, and the art direction. Parsed through a factory that
   validates every field and falls back rather than throwing: an unknown kind
   becomes `note`, a malformed accent is simply absent.
3. **Art direction.** The brief's `art` maps to a `DocumentTheme` (preset plus
   accent / font pair / radius / density overrides) and is applied to the
   document as it is created. `ArtDirection` is authoring vocabulary; the
   mapping to the `documents` theme happens in the application layer, so the two
   bounded contexts still do not import each other.
4. **Writer prompt.** The generation system prompt becomes format contract +
   style guide + the chosen recipe's skeleton + the brief. The model fills a
   plan instead of picking from a catalogue.
5. **Restyle on demand.** The same art pass, run against an existing document,
   behind a "Style for me" button in the Design panel — and after a
   "make it pretty" transform, which today changes structure but never dress.

**Out of scope:** per-theme custom presets saved by the user (STEP 9), and any
style parameter the user sets once for every document (#15, also STEP 9).

Acceptance:

- [ ] A generated document opens with a theme chosen for its subject — accent, font pair, radius and density — and the Design panel still overrides all four
- [ ] Two different kinds asked for in a row (a postmortem, then a roadmap) come out with visibly different skeletons, not the same one reskinned
- [ ] A garbage brief (unknown kind, bad accent, missing sections) still produces a document: every field falls back, nothing throws
- [ ] The planning call is short enough that the first streamed block still arrives quickly; a provider that fails the planning call still writes the document with the default recipe
- [ ] "Style for me" restyles an existing document without touching one byte of its content

---

### STEP U8 — Editing ergonomics (search, paste, tables, shortcuts)

**Goal:** what is expected of an editor before the first block is even
discussed — find a word, paste from anywhere, drive a table, know how long the
document is.

**Why:** the palette is rich and the plumbing around it is thin. There is no
find and replace at all; a pasted spreadsheet arrives as a wall of text and a
pasted markdown as literal `##`; the table bar offers three commands (add a
column, add a row, drop the table) and no way to delete a row or merge two
cells; no shortcut belongs to the product — `Mod-S`, `Mod-F`, `Mod-K` do
nothing. None of it touches the schema, so none of it can hurt an existing
document.

Instructions:

1. **Find & replace.** The rule is pure and lives in the domain:
   `src/domain/documents/text-matches.ts` — document text plus a query and its
   options in, ranges out, tested in Node with no DOM. The ProseMirror plugin
   that decorates the ranges and the `Mod-F` bar stay in
   `src/components/editor/`. Replace and replace-all are one transaction, so
   one undo takes them back.
2. **Paste that understands what it is given.** `handlePaste` already claims
   image files (`src/components/Editor.tsx`); a testable
   `src/components/editor/paste-conversion.ts` takes the rest: markdown text
   through the import path that exists (`marked` → HTML → `parseHtmlBody`, see
   `src/lib/import.ts`), web HTML stripped of everything the schema does not
   know, and the TSV a spreadsheet puts on the clipboard as a real table.
3. **A table bar worth the name.** Delete row, delete column, toggle the header
   row, merge and split cells, column alignment — every command already ships
   with `@tiptap/extension-table`; `FormatGroups.tsx` simply does not call them.
4. **Input rules.** `@tiptap/extension-typography` for quotes, dashes and
   ellipses, plus the markdown rules still missing. Automatic typography is a
   style decision, so it answers to `StyleParameters`
   (`src/domain/authoring/style-parameters.ts`), not to a hardcoded default.
5. **Length.** Words and reading time from `@tiptap/extension-character-count`,
   in the toolbar's right cluster beside the save status.
6. **Shortcuts that belong to the product.** `Mod-S` (save now), `Mod-K` (link),
   `Mod-F` (find), declared in one extension rather than scattered — and
   **listed in `ShortcutHelp.tsx`**, which today shows Tiptap's defaults and
   nothing else.

**Out of scope:** search across documents (#19, STEP 10) — this is one document.

Acceptance:

- [ ] `Mod-F` highlights every occurrence, `Enter` walks them, and replace-all is a single undo
- [ ] A spreadsheet range pastes as a table, markdown text pastes as blocks, a screenshot still pastes as an image
- [ ] A row and a column can be deleted and two cells merged from the table bar
- [ ] The word count follows typing, and reading time is derived from it — not from a second traversal
- [ ] Automatic typography follows the Style setting; off means the characters typed are the characters stored
- [ ] Every shortcut the product adds appears in the shortcut overlay

---

### STEP U9 — The blocks a 2026 editor is expected to have

**Goal:** checkboxes, collapsible sections, math, highlighted code, sub- and
superscript, emoji. None is a house layout block: they are official Tiptap
extensions, so the work is not the editor — it is making them survive HTML,
Markdown, Word and print.

**Why:** a task list is how a document holds actions, a collapsible section is
how a long spec stays readable, and a code block without a language is a
screenshot of code. Their absence is what makes the palette read as limited
even though the layout blocks are unusually rich.

Instructions — one block per commit, each following the registration rules
above:

1. **Task list** — `TaskList` / `TaskItem` from `@tiptap/extension-list`,
   already present through StarterKit. Markdown has a native form (`- [ ]`);
   Word gets a symbol plus text.
2. **Collapsible section** — `@tiptap/extension-details`. Everything outside the
   editor renders it **open**: an export never hides content behind a triangle.
3. **Math** — `@tiptap/extension-mathematics` with `katex`, inline and block,
   `$…$` and `$$…$$` in Markdown.
4. **Highlighted code** — `@tiptap/extension-code-block-lowlight` with
   `lowlight`: a language picker on the block, and colours that survive print.
5. **Superscript / subscript** — two marks, two buttons in `FormattingRow`.
6. **Emoji** — `@tiptap/extension-emoji`, a `:` picker on the same
   `@tiptap/suggestion` the slash menu already uses. It obeys the Style
   parameter: emoji off means the picker never opens, matching the rule
   `beautify` already enforces on model output.

Each block also earns its slash-menu item (English and French keywords, like
every existing one) and its line in the print `break-inside` list.

**Out of scope:** diagrams (Mermaid and friends) — they stay STEP 10, as
decided; and any block that would need a new UI library.

Acceptance:

- [ ] Each block inserts from `/`, survives a reload, and comes out right in HTML, Markdown, Word and PDF
- [ ] The model emits each new block when asked for it, and `validateDocJson` accepts what it emits
- [ ] A collapsible section exports open, with its summary as a heading
- [ ] A code block keeps its language after a reload and prints highlighted
- [ ] Emoji off: the `:` picker does not open, and nothing strips emoji already typed by hand
- [ ] `npm ls` shows only the extensions this STEP added — no transitive UI library came with them

---

### STEP U10 — Images, media and placement

**Goal:** an image is an `<img>` with an alt text and four fixed widths. Make it
a figure: a caption, a place on the page, a size the writer chooses — and open
the family to the other things people drop into a document.

**Why:** the document surface is print-shaped, and print is where an unplaced
image hurts most. Everything here is already half-built: upload, paste and drop
work, `chart` already models a caption, and `cards.ts` is the isolating-block
pattern a gallery copies.

Instructions:

1. **Caption.** A `caption` attribute on `doc-image.ts`, shaped like the one
   `chart` carries, edited beside the alt text in `ImageView.tsx`, rendered as
   `<figure>` / `<figcaption>`.
2. **Placement.** An `align` attribute (left / center / right / full) and text
   wrap, expressed in theme tokens rather than fixed CSS, and honoured in print.
3. **Free resize.** A drag handle beside the four presets, storing a percentage
   of the text column — never pixels, since the theme and the paper decide the
   real width. The drag state is a module a test can drive, not component state.
4. **Gallery.** An `imageRow` block holding two to four images, isolating, same
   shape as `cardGrid`.
5. **Paste and upload, finished.** An image URL pasted becomes an image instead
   of a link; a failed upload reports in place, replacing the `window.alert` in
   `image-upload.ts`; a multi-file drop shows progress.
6. **Embeds.** `@tiptap/extension-youtube` plus a generic `embed` block over a
   domain allowlist — never an arbitrary `iframe`. Exports render a titled link:
   a dead frame is worse than a link.
7. **Attachments.** `src/lib/uploads.ts` widens its MIME list and size to carry
   PDFs and documents, and an `attachment` node renders the file row. **SVG
   stays excluded** for the XSS reason already written there, and the serving
   route keeps its `default-src 'none'; sandbox` CSP.

**Out of scope:** an image library or media manager across documents (STEP 10
territory), and image generation.

Acceptance:

- [ ] A captioned image aligned right, with text flowing around it, prints as it renders
- [ ] A freely resized image keeps its width after a reload, and still fits the page in print
- [ ] A three-image gallery exports to HTML, Word and PDF without collapsing to one column
- [ ] Pasting an image URL inserts an image; pasting a page URL still inserts a link
- [ ] A rejected upload (too large, wrong type) is reported inside the document, not in an alert, and no node is left behind
- [ ] An embed exports as a titled clickable link; an SVG upload is still refused

---

### STEP U11 — AI at the caret

**Goal:** the assistant lives in a side panel and in a selection bubble. Bring it
where the cursor is: a prompt anywhere, a continuation, an action per block, a
question about the document.

**Why:** the expensive half already shipped — NDJSON streaming
(`/api/transform`, `src/lib/ai/transform-stream.ts`), op-by-op application
(`src/components/editor/streamed-transform.ts`) and Accept/Reject review
(`useAiReview`, `AiDiffBar`). What is missing is the surface, and the habit it
serves: nobody opens a panel to rewrite one paragraph.

Instructions:

1. **`Mod-K` anywhere.** A floating prompt at the caret, in an empty document as
   in the middle of a paragraph; the answer streams in and lands under the
   existing review.
2. **Continue writing.** A continuation from the text above, shown as ghost text,
   accepted with `Tab`, discarded with `Escape`. Context comes from
   `document-digest.ts`, not the whole document.
3. **Per-block actions.** On the drag handle: rewrite, shorten, expand, and
   *turn into* (table, steps, key figures, chart). One op on one index — never a
   whole-document pass.
4. **Ask the document.** An answer grounded on the digest, citing the sections it
   used, changing nothing until an insertion is asked for.
5. **One contract.** Every surface goes through `authoringDeps`
   (`src/lib/ai/service.ts`), `validateDocJson` and `beautify`. A surface that
   talks to a model on its own is a defect, not a shortcut.

**Out of scope:** agentic multi-step editing, and any AI that writes without a
review step.

Acceptance:

- [ ] `Mod-K` in an empty document writes a first block, streamed, reviewable
- [ ] "Continue" offers a suggestion accepted with `Tab` and undone in one undo
- [ ] Turning a paragraph into key figures leaves every other block byte-identical
- [ ] A malformed op is rejected whole — never half-applied — with the existing retry
- [ ] A provider without streaming falls back to the blocking path and still answers
- [ ] Asking a question inserts nothing until the answer is explicitly inserted

---

### STEP U13 — Two assistants: a writer and a layout designer

**Goal:** stop asking one call to be good at two jobs. A **writer** owns the
words — tone, argument, length, language. A **layout designer** owns the shape —
which block carries what — and changes no word. Which one runs is read off the
surface the user touched, and said out loud.

**Why:** every AI surface today sends one prompt that must arbitrate between
writing well and presenting well, and the arbitration is invisible: when the
result disappoints there is no way to tell which half failed. Splitting the two
makes each prompt single-purpose, and — the part that matters — makes a rule
possible that cannot exist today: *the layout pass changed no word*. That is
checkable, deterministic and testable, so "it only recoloured it" becomes a
failed call rather than an impression.

This reverses one line of STEP U11's out-of-scope: multi-step editing is now the
point. What stays out is an agent that loops or calls tools.

Instructions:

1. **An `Agent` contract, and two of them.** `src/domain/authoring/agents/`:
   `contract.ts` (id, label, the system prompt it contributes, its temperature,
   what it may emit), `writer.ts`, `designer.ts`, `catalog.ts` — the registry
   shape the export targets, composers and recipes already use. A third agent is
   a file and a line.
2. **Layout fidelity is a domain rule.** `src/domain/authoring/layout-fidelity.ts`:
   the text of the designer's answer, whitespace normalised, equals the text it
   was given. A drift triggers the existing retry; a second drift refuses the
   answer rather than storing a rewrite the user never asked for. Without this
   rule the two agents collapse back into one within three prompts.
3. **Routing is deterministic, everywhere.** A block action carries its `family`
   (`rewrite` → writer, `turn-into` → designer); "Style for me" and "make it
   pretty" are the designer; a selection quick action is the writer; a free
   prompt is the writer, because touching the words and not the shape is the
   safe half of any request. *Revised by [STEP U14](#step-u14--the-cost-of-one-ai-call):
   the free prompt was originally read by a short model call, which cost a whole
   round trip — its own contract, its own thinking — before any work began, and
   could answer "both", making one click two waits. The user who wanted the other
   half is one click from the styling action, on a passage that has settled.*
4. **The reason is shown.** "Rewriting the words" is what the user reads while it
   runs. A decision that is invisible is a black box nobody can report a bug
   against.
5. **One pipeline, unchanged.** Every step still goes through `authoringDeps`
   (`src/lib/ai/service.ts`), `validateDocJson` and `beautify`, and a chain lands
   under one review bar: Reject undoes the whole assignment, not the last step.
6. **One provider for both.** Per-agent models are a later step; what this one
   proves is whether separating the prompts is enough.

**Out of scope:** a provider per agent, an agent that loops or calls tools, and
a layout pass inside generation — generation streams its first block in seconds
and a second pass would cost that. A whole-document edit also runs one assistant
per request: a button already names it, and a free prompt that wants both is
answered by the writer, on a document the user can then ask to lay out.

Acceptance:

- [ ] Turning a paragraph into a table invents nothing: every figure survives, the wording is the paragraph's, and the only new words are the labels a table needs
- [ ] A layout answer that reworded is retried, and refused rather than applied if it drifts again
- [ ] "Add a conclusion" runs the writer alone, "make it scannable" the designer alone, and no single click ever runs both
- [ ] The user sees which assistant is running and why, before the answer lands
- [ ] Rejecting a two-step answer restores the document deep-equal to what it was
- [ ] Generation still streams its first block with no second pass
- [ ] No surface talks to a model outside `authoringDeps`

---

### STEP U14 — The cost of one AI call

**Goal:** an AI action costs what the work costs, not what the plumbing costs.
"Shorten this paragraph" answers in seconds, not in twenty; "make it pretty"
answers in tens of seconds, not in minutes.

This is a **P0 product need** (#6b), not a round of optimization. A writer who
waits twenty seconds for a rewrite writes it themselves, and never asks again —
the feature is not slow, it is unused. Every surface below carries a latency
budget, and a change that misses its budget is not done, whatever it adds.

**Why:** measured on a real document (26 794 characters of body JSON, 6 095 of
visible text), one editing surface was paying four separate taxes that have
nothing to do with the work asked for:

| Tax | Measured | Status |
|---|---|---|
| The format contract and style guide, shipped whole to every call | 3 030 tokens, every time | **Done** |
| A model call to decide which assistant answers, before any work | one round trip, with its own thinking | **Done** |
| Two assistants chained inside one click | two waits for one action | **Done** |
| Reasoning effort never stated, so a reasoning model deliberates over a one-line rewrite | most of the seconds, on GLM-class models | **Done** |
| ProseMirror JSON as the model's wire format | **×4.4** the visible text, in **both** directions | Open |
| A passage edit that streams nothing | the user sees the first byte when they see the last | **Done** |

The first four shipped together: a prose-only assistant's system prompt went
from 3 030 to 1 101 tokens, and a free prompt costs one call instead of three.
Streaming the passage followed. What is left is the format — the only one that
shortens the wait itself rather than what the user does with it.

Storage is **not** on this list and never was: `JSON.parse` on a 78 KB document
takes 0.15 ms. The document stays ProseMirror JSON on disk — it is the editor's
own shape, and changing it would buy nothing.

Instructions:

1. **A model-facing format that is not JSON.** Markdown for what markdown
   already covers, plus `:::` directive blocks for what it does not
   (`statRow`, `cardGrid`, `chart`, `diagram`, …). An emitter and a parser under
   `src/infrastructure/rendering/` — the markdown emitter is most of one half
   already — with a round-trip test per block type: every block in the schema
   survives body → text → body deep-equal. Two wins, and the second is bigger
   than the first: **×4.4 down to about ×1.2** on tokens, and a syntax the model
   already knows, so the format contract shrinks again *and* invalid answers —
   the ones that trigger the retry, which doubles the wait — become rare.
   Do **not** invent a private syntax: `:::` is a convention models have read
   millions of times, and a bespoke one reopens the problem markdown solves.
2. **The passage streams.** ✅ `/api/passage` through `blockStreamResponse`, as
   generation and the caret already do, with the blocking action as its fallback
   — the caret's handover, not a second shape for the same edit.

   The trade was decided rather than dodged: the streamed path has no `askJson`
   retry, and STEP U13's charter check compares the whole answer to the passage
   so it cannot run block by block. It runs as the stream's **verdict**
   (`BlockStream.verdict`, `domain/authoring/agents/charter-breach.ts`), and a
   breach — like any late failure — makes the editor put the passage back whole
   (`insert-streamed-passage.ts`). Losing the retry is the price paid: an answer
   the schema rejects is dropped block by block, as it already was at the caret.
   Position bookkeeping is `components/editor/streamed-passage.ts`, a module a
   test drives without an editor.
3. **Measure before and after, per surface.** `DOCYFIER_LOG_USAGE=1` already
   prints tokens in, tokens out, tokens thought, tokens the provider had already
   seen, and seconds. A change to a prompt without that line is a guess.

**Out of scope:** changing how documents are stored; a per-agent provider (still
STEP U13's out-of-scope); response caching — an answer that outlives the request
is stale, because the document it was about has moved on. Sharing a call that is
*in flight* is not caching and already ships.

Acceptance:

- [ ] Every block type round-trips body → model format → body, deep-equal
- [ ] A passage edit on a paragraph answers in under 5 s on the reference provider
- [ ] "Make it pretty" on the 78 KB reference document answers in under 60 s
- [ ] The usage log shows the reused-prefix percentage on a provider that caches
- [ ] No surface keeps two code paths for the same edit

---

### STEP U12 — Comments, suggestions & history

**Goal:** the record of the work: comment on a passage, propose a change rather
than make it, and go back to what the document was yesterday.

**Why:** this is the only axis that adds data of its own, and the only one that
prepares STEP 6 — a comment needs an author, and STEP 6 is where authors become
plural. Mono-user for now: the author is the instance, and the model is built so
that STEP 6 substitutes real identities without touching the document format.

Instructions:

1. **A `collaboration` bounded context.** `src/domain/collaboration/`:
   `Comment` and `Thread` entities (anchor, author, date, resolved), a
   `ThreadRepository` port, and files / PostgreSQL / MySQL adapters behind the
   same driver contract suite the document repositories already pass unchanged.
2. **Anchoring.** A `comment` mark carries the thread id inside the document
   JSON; the thread itself lives outside it. A thread whose anchor is gone is
   **orphaned, not lost** — a domain rule with a test, and a visible state in
   the UI.
3. **Suggestions.** `insertion` and `deletion` marks reusing the decorator built
   for AI diffs (`ai-diff.ts`), accepted or rejected through `AiDiffBar`.
   Accepting produces exactly the proposed text.
4. **History.** A snapshot per server write — `saveDocumentAction` already knows
   the base version and the new `updatedAt` — with bounded retention, a version
   list, a comparison built on `block-diff.ts`, and a restore that writes a new
   version instead of erasing any.
5. **Exports stay editorial-free.** An export carries the accepted text, without
   comment or suggestion marks. Including them can become a target option later.

**Out of scope:** real-time collaborative editing (deferred until demanded, as
STEP 6 records), notifications, and per-user permissions on a thread — STEP 6.

Acceptance:

- [ ] Comment a selection, reply, resolve; the thread survives a reload and follows the text as it is edited
- [ ] Deleting the anchored text leaves the thread orphaned and visible, never silently dropped
- [ ] Accepting a suggestion yields exactly the proposed text; rejecting restores the prior JSON deep-equal
- [ ] Restoring an old version creates a new version and destroys none
- [ ] No export contains a comment or suggestion mark, in any target
- [ ] The three storage drivers pass the same thread contract suite, unchanged
