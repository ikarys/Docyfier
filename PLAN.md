# Docyfier — Plan

Roadmap derived from [vision.md](vision.md). Priorities below **challenge** the
original P\* where justified; the "Was → Now" column tracks every change.

**MVP = STEPS 0–4.** Everything after is post-MVP.

The UX & rendering upgrade STEPS **U1–U6** ([Part C](#part-c--ux--rendering-upgrade-steps-u1u6))
slot **between STEP 2b and STEP 3**. Recommended order: U1 → U4 → U3 → U2 → U5 → U6.

## Part A — Prioritized needs

| # | Need (from vision.md) | Was | Now | Rationale for change |
|---|---|---|---|---|
| 1 | AI-assisted writing & formatting for professional environments | P0 | P0 | Core value |
| 2 | Modern, intuitive web UI usable by non-technical users | P0 | P0 | Core value |
| 3 | AI writing help: generation, summaries, rephrasing | P0 | P0 | Core value |
| 4 | Modern, polished formatting: tables, columns, headers, colors, callouts | P0 | P0 | Core differentiator |
| 5 | Charts & diagrams blocks | P0 (implicit in #4) | **P1** | Split out: a large sub-project; MVP ships text/table/layout formatting first. Charts pulled forward into [STEP U6](#step-u6--data-viz-blocks--rich-cover); diagrams stay in STEP 10 |
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
- Single-user authentication (no orgs, no roles).

**Out of scope:** multi-tenant anything (#10, #11); schema migration tooling —
the single `documents` table is created idempotently on connect.
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
- Diagrams blocks (#5, the flow/architecture half) — charts were pulled forward
  into [STEP U6](#step-u6--data-viz-blocks--rich-cover).

**Exit criteria:** per integration: connect, list, import, push update without leaving the app.

## Part C — UX & rendering upgrade STEPS (U1–U6)

Motivation: the current editor produces correct but classic documents; the UX is
toolbar-only; themes are four fixed presets; whole-document AI transforms are
slow and token-hungry. These STEPS modernize the editing UX (U1), make AI fast
and safe (U4), make themes customizable (U3), enrich rendering (U2) and add
templates (U5) and add data-viz blocks (U6). They slot between STEP 2b and
STEP 3 and pull parts of STEP 9 and STEP 10 forward.
Recommended order: **U1 → U4 → U3 → U2 → U5 → U6**.

### Ground rules for implementers (read before any U-STEP)

- Read [AGENTS.md](AGENTS.md), then these files before writing code:
  `src/components/Editor.tsx`, `src/components/extensions/Cards.ts` (the
  canonical custom-node pattern — copy its structure for any new node),
  `src/lib/ai/prompts.ts`, `src/lib/ai/doc-schema.ts`, `src/lib/ai/service.ts`,
  `src/lib/store.ts`, `src/lib/themes.ts`, `src/app/globals.css`.
- Stack: Next.js 15 (App Router + server actions), Tiptap v3, Vercel AI SDK v7,
  Tailwind v4. Documents are ProseMirror JSON on disk via `src/lib/store.ts`.
- **Every new node type must be registered in three places** or AI output will
  fail validation: the editor extensions (`Editor.tsx`), the server validation
  schema (`src/lib/ai/doc-schema.ts`), and the AI format contract
  (`src/lib/ai/prompts.ts`).
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
   `src/lib/ai/prompts.ts`: input = the document as a numbered list of
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
