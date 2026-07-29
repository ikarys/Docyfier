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
menu). LLM = any OpenAI-compatible endpoint via Vercel AI SDK (`src/lib/ai/`);
several providers can be saved and the active one switched from Settings, the
only place that choice lives; AI output is schema-validated ProseMirror JSON. Every stored
credential (LLM keys, DB password, `secret` export options) is encrypted at rest
via `src/infrastructure/configuration/aes-gcm-cipher.ts` and write-only in the UI
— never send one to a client component. The instance password is not encrypted
but hashed (scrypt), which is the only correct treatment for something no code
ever needs to read back. Single-user auth is in and opt-in (STEP 4):
one password, off until credentials exist. No multi-tenant yet.

Documents are ProseMirror JSON kept in files, PostgreSQL or MySQL — one driver
among three behind `src/lib/store/`, selected at runtime from the Settings page. The earlier markdown-file model was dropped: users arrive
with no source. Stack validated: Next.js + TypeScript + Tailwind v4 + Tiptap.
Node is pinned via `.nvmrc` (nvm).

Editor UX and rendering STEPS U1–U7 are in: slash menu and drag handles;
streaming generation, op-based transforms and AI diff review; themes as
adjustable token sets (accent, font pair, radius, density) with a Design panel;
images, cover, table of contents and print control; charts, block icons and
dashboard stat cards; templates gallery with search/rename/duplicate in the
document list; file import (md / txt / docx) and pluggable export targets
(Word, Confluence, Notion, Trilium) from STEP 5 — adding a target is one adapter
under `src/infrastructure/publishing/targets/` plus a line in the registry at
`src/lib/export/registry.ts`. Settings is one route
per scope (`/settings/{ai,storage,style,exports,access}`). STEP 8 is in: the email and
ticket composers under `/compose`, same plugin shape in
`src/domain/composing/composers/` —
short-form writing that ends in the clipboard, not in a document. STEP 9 is in:
the instance has a `Brand` (`src/domain/documents/brand.ts`) — the theme new
documents start in, plus presets it saved for itself, referenced by id so
editing one repaints the documents wearing it — and a `StyleParameters`
(`src/domain/authoring/style-parameters.ts`) that decides emoji, keyword
bolding, status badges and the writing language. The style guide is a function
of those parameters, and emoji-off is enforced in `beautify` rather than only
asked for. Both live in `/settings/style`; a template and an art direction still
win over the brand, which dresses what nobody else dressed. STEP U7 is in:
a document is planned before it is written — one short call decides its kind,
audience, tone, sections and art direction, and the writer then fills the
skeleton of a **recipe** (`src/domain/authoring/recipes/`, same registry shape:
one file plus one line). The art direction reaches the document as its theme,
streamed ahead of the first block; `authoring` names a dress in its own
vocabulary and `src/application/documents/theme-from-art.ts` is the only place
it becomes a `DocumentTheme`. "Style for me" in the Design panel runs the same
pass over an existing document.

The diagram half of STEP 10 is in, ahead of U8–U12 at the maintainer's call:
five kinds (flow, architecture, sequence, hierarchy, phase axis) under
`src/domain/documents/diagram/`, copying `chart`'s shape exactly — an atom node
whose attrs are the graph, a `diagramError` shared by the node view, the panel
and `schema.ts`. Three rules carry it: a diagram declares **meaning, never
coordinates** (`layout/` places every box, so nothing can be dragged out of
place); there is **no layout library and no mermaid** (the STEP U6 rejection
stands); and one **scene** feeds two emitters — the editor paints theme tokens,
`infrastructure/rendering/svg/scene-to-svg.ts` paints literal values, because
librsvg resolves no CSS variable. `sharp` is a declared dependency for that one
purpose: rasterising a figure for Word, Confluence and Trilium without a
headless Chromium.

What the editor still cannot do is written down as STEPS **U8–U12** in PLAN.md:
find and replace, paste that understands markdown or a spreadsheet, a table bar
past three commands, checkboxes, collapsible sections, math, highlighted code,
images with a caption and a place on the page, AI at the caret, and comments,
suggestions and version history. Next: **STEP U8**, then U9 → U12, then the
rest of STEP 10 and STEP 6 (multi-tenant). PDF stays print-based on purpose; a headless-Chromium renderer
is the only open item of STEP 3 and was judged not worth its weight.

## Working conventions

- All artifacts in English: code, comments, docs, commit messages, identifiers.
- Conventional Commits: `type(scope): subject`.
- No code until a STEP is explicitly started by the maintainer.
- Non-trivial tasks (multi-file, design choices): plan first, get approval, then execute.
- Keep diffs small and focused; one concern per commit.

## Code quality standards

Non-negotiable for every change. A diff that breaks one of these is not done,
whatever the feature says. When an existing file already violates a rule, fix
the part you touch — do not extend the violation.

### Architecture — dependencies point inward

Four layers. A layer may only import from layers below it; never sideways into
a sibling's internals, never upward.

```
app/           Next.js routes, server actions, React components  (framework)
  ↓
application/   use cases: orchestrate the domain, own transactions & authz
  ↓
domain/        entities, value objects, domain services, ports (interfaces)
  ↑
infrastructure/ adapters implementing domain ports: SQL, fs, LLM, crypto, HTTP
```

Six bounded contexts already live this way and are the reference to copy:
`documents` (the `Document` entity, the `DocumentRepository` port, the files /
PostgreSQL / MySQL / in-memory adapters), `configuration` (the `AiProvider` and
`ProviderCatalog` entities, the `StorageConnection` value object, the
`SecretCipher` and repository ports, the settings-file adapters), `authoring`
(what models get wrong on the way out, the prompts, the op contract, the
`TextGenerator` port and its OpenAI-compatible adapter), `publishing` (the
`ExportConfiguration`, the `ExportTarget` port and its four adapters),
`composing` (the `Composer` contract, the `AnswerWriter` and `AnswerParser`
ports, the email and ticket flows) and `access` (the `Session` entity, the
`LoginAttempts` lockout, the `PasswordHasher`, `SessionSigning` and
`CredentialsRepository` ports, the scrypt / HMAC / file adapters). The document
renderers — HTML, Markdown, Jira, plain text — are adapters too and live in
`infrastructure/rendering/`. Composition roots stay under `src/lib/`: `store/`,
`settings/{ai,storage,exports}`, `ai/service.ts`, `export/`, `compose/`,
`auth.ts`, `import.ts`, `templates-check.ts`.

No infrastructure adapter imports upward any more: the SQL repositories take the
`StorageConnectionRecord` the domain declares, and the OpenAI-compatible adapters
(`src/infrastructure/authoring/openai-compatible/`) receive the provider to talk
to as an argument — `src/lib/ai/provider.ts` is the only module that resolves it
from Settings. `src/lib/doc/` is gone: its rules went to the domain (`beautify`,
`block-diff`, `chart`, `import-file`), its conversions to
`infrastructure/documents/` (`source-html`, `html-body-parser`, `editor-body`),
and its browser halves next to the editor components. The Tiptap node
definitions and the schema AI output is validated against are adapters too, and
live in `infrastructure/editor/`; what stays in `app/` is what renders — the
React node views and the slash menu. Editor state still lives in components,
and pulling those state machines into testable modules is the next step.

- **The domain imports nothing.** No `next/*`, no `@tiptap/*`, no `react`, no
  `pg`/`mysql2`, no `ai`, no `node:fs`. If a domain file needs an import from
  those, the abstraction is missing. This is the rule that currently fails most
  often: `JSONContent` from `@tiptap/react` must not appear in a domain type —
  the document body is a domain type the editor maps to, not the reverse.
- **Ports live with the domain, adapters in infrastructure.** `DocumentStore`,
  `TextGenerator`, `SecretCipher`, `SettingsRepository` are interfaces declared
  by the domain; `pg`, `mysql`, `fs`, the OpenAI-compatible client implement them.
- **Dependencies are injected, never fetched.** No module-level singleton, no
  `globalThis` cache, no import of a concrete adapter from a use case. Composition
  happens in one place per process boundary (a composition root under `app/`).
- **Server actions are thin.** Parse input, call one use case, map the result to
  a UI shape. No business rule, no persistence call, no `fetch` in an action.
- **Cross-cutting concerns are decorators, not copy-paste.** Auth, logging and
  revalidation wrap a use case once; they are not re-typed in every action.

### Domain modelling (DDD)

- Model the ubiquitous language from `docs/vision.md`: Document, Composition,
  Theme, ExportTarget, Provider. Names in code match the names the product uses.
- **Entities own their invariants.** Title derivation, rename, duplication and
  timestamping belong to the `Document` entity — not to the store, not to an action.
- **Value objects over primitives** for anything with a rule: `DocumentTitle`
  (trim, max length, fallback), `ProviderId`, `BaseUrl`, `Secret`. Constructed
  through a factory that validates; illegal states are unrepresentable.
- **Bounded contexts stay separate**: `documents`, `authoring` (AI), `publishing`
  (export), `composing`, `configuration`, `access`. They communicate through
  explicit contracts, never by importing each other's entities.
- **Anemic models are a defect.** A file of `interface X` plus free functions
  that mutate `X` means the behaviour belongs on `X`.
- **Domain errors are typed** (`DocumentNotFound`, `ProviderUnreachable`), carry
  data, and never carry UI copy. User-facing wording is chosen in `app/`.

### SOLID

- **S** — One reason to change per module. A file mixing I/O, env resolution and
  three unrelated config scopes is split. Hard ceilings: **file ≤ 250 lines**,
  **function ≤ 40 lines**, **React component ≤ 150 lines**, **cyclomatic ≤ 10**.
  Crossing one is a signal to split, not a threshold to argue about.
- **O** — Extension by registration, not by editing a switch. The export-target
  and composer registries are the reference shape; every new pluggable family
  copies it: a contract file, one file per implementation, one registry line.
- **L** — Every implementation of a port is substitutable: same pre/post
  conditions, same errors. The driver contract test suite runs against all
  drivers, unchanged.
- **I** — Callers receive the narrowest interface they use. Do not hand a whole
  settings record to something that needs one field.
- **D** — Depend on the port, never on the adapter. `import { pgStore }` inside
  a use case is a review blocker.

### Clean code

- Names say intent; no `data`, `info`, `handle`, `manager`, `utils`, `helpers`.
  A module named for a technical noun is a module without a responsibility.
- **No god file, no god component.** Split by responsibility, not by size alone:
  a 700-line editor is a state machine, a toolbar and a panel host — three files.
- **DRY on knowledge, not on shape.** Two identical lines with different reasons
  to change stay apart; a rule expressed twice gets one home. Fence unwrapping
  now lives in `domain/authoring/model-answer.ts` and form parsing in the
  settings entities; `unknown → message` is still spelled out per action.
- Guard clauses over nesting; max 2 levels of indentation in a function body.
- No boolean parameters that select behaviour — split the function.
- No dead code, no commented-out code, no `TODO` without an issue reference.
- Comments explain **why**, never **what**. This codebase does it well; keep it.
- **Validate at the boundary, once**, with a schema (zod), and pass typed values
  inward. No hand-rolled `String(x ?? "")` parsing scattered across actions.
- Secrets: encrypted at rest via the cipher port, write-only in the UI, never in
  a client component, never in a log, never in an error message.

### Tests — TDD by default

- **Red → green → refactor.** Write the failing test first for every domain rule,
  use case and bug fix. A bug fix without a test that reproduced it is incomplete.
- Test pyramid: many unit tests on `domain/` (pure, no I/O, no mocks needed);
  focused tests on `application/` use cases with in-memory fakes; contract tests
  per port, run against every adapter; a thin end-to-end layer on critical paths
  (create → edit → save → export).
- **Fakes over mocks.** An in-memory `DocumentStore` beats a mock framework and
  proves the port is a real abstraction.
- Tests state behaviour, not implementation: name them by the rule they pin
  (`renaming to an empty title hands the title back to the content`).
- **Coverage floor: 80% overall, 95% on `domain/`.** Coverage is a floor, not a goal.
- No test touches the network, the clock or randomness: `Clock` and
  `IdGenerator` are injected ports, so a test states what "now" means.
- No test touches the real filesystem or a shared database, with one exception:
  an **adapter contract test**, which cannot prove an adapter over files against
  anything else. Those use a temporary directory or a disposable database, and
  clean it up.
- **CI gates every push and PR**: typecheck, lint, test, coverage floor, build.
  A red gate blocks the merge.

### Frontend

- Server Components by default; `"use client"` only where interactivity requires
  it, at the deepest node that needs it.
- Components render. State machines, network calls and persistence live in hooks
  or plain modules that a test can drive without a DOM.
- One component per file; a component that reads more than ~5 pieces of state is
  hiding a state machine — extract a reducer and test it directly.
- No business rule in JSX. No `fetch` in a component body.
- Styles are tokens (see `src/lib/themes.ts`); global CSS stays a token layer and
  a reset, not a component stylesheet of thousands of lines.

### Definition of done

A change ships only when: tests written first and passing · typecheck and lint
clean · no new file over the ceilings · no domain file importing a framework ·
public behaviour documented where it is not obvious · one concern in the commit.
