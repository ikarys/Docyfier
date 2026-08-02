# Diagram conversion reliability

## Problem

"Turn into a diagram" on a box-drawing (ascii-art) block asks the model to
both *read* the drawing (extract nodes, edges, and nesting) and *decide*
its style (kind, direction, accent, icon) in one call. On a real drawing —
five levels of nested boxes, several sibling groups — the model dropped the
`parent` field on every group. The result is schema-valid (nothing in
`diagramError` requires a group to declare a parent) but visually wrong: three
flat, non-nested bands instead of one containment tree, plus dead groups
declared for leaf boxes and orphan nodes duplicating a group's own label.

Nothing caught this. The user's only recourse today is "reject, try again,"
repeatedly, on a call that can already take up to 90 seconds. That is not
an acceptable failure mode — confirmed in conversation as the trigger for
this work ("I can't ask users to regen again and again until the system
wants to make a good diagram").

## Goals

- Remove the failure mode for ascii-art diagram conversion: structure
  (nodes, edges, group nesting) should not depend on a model correctly
  inferring what a deterministic parser can read directly off the
  characters.
- Give every streamed block — not diagram-only — a bounded second chance
  when it fails validation, instead of being silently dropped.
- Close the specific validation gap that let this exact bad shape (dead
  groups, missing parent) through unnoticed.
- Do this without adding a second full model round-trip ahead of
  generation (rejected in-conversation: doubles latency on a path that
  already times out, and STEP U13 already rejected a model-based routing
  pre-pass for the same reason).

## Non-goals

- Reworking non-ascii diagram requests ("create a diagram of X" from plain
  text, "style for me"): still fully model-driven, no parser involved,
  since there is no drawing to parse.
- A generic self-healing/auto-repair merge between a model's output and
  the parser's output. Rejected: the id-correlation problem (matching a
  parser-derived box to a model-invented one by label similarity) is
  fragile and was judged not worth the complexity next to prompt
  injection (see Approach below).
- Style/organization decisions (`accent`, `icon`, `kind`, `direction`) stay
  the model's call. The parser never touches them.

## Architecture

Two independent additions, both slotting into the existing pipeline —
no new request path, no new node type.

### 1. Deterministic ascii parser

`src/domain/documents/diagram/ascii-parse.ts` — pure domain module, no I/O,
no framework import (same constraint as the rest of `domain/`).

```
parseAsciiDiagram(source: string): ParsedSkeleton | null
```

Reads box-drawing characters (`┌ └ ┐ ┘ ─ │ + |`) and arrows (`-> --> | v ▼`)
to produce:

- `nodes`: `{ id, label, note }[]` — one per box. `id` is a slug derived
  from the label, de-duplicated when two boxes share a name.
- `groups`: `{ id, label, parent }[]` — one per box that contains other
  boxes. Nesting depth (indentation / enclosing box) becomes the `parent`
  chain directly — this is the exact information the model dropped.
- `edges`: `{ from, to, label, style, head }[]` — one per arrow, resolved
  to the two node ids it connects.

Returns `null` whenever the input doesn't parse with confidence (no
box-drawing characters found, an arrow that can't be resolved to two
boxes, ambiguous nesting). `null` is a first-class, expected result — it
means "fall back to the pure-model path, unchanged, still covered by the
retry net below." The parser never guesses.

Scope for this iteration: containment **and** arrows (both node/group
extraction and edge extraction are deterministic). Style attributes
(`accent`, `icon`) and the diagram-level choices (`kind`, `direction`) are
never produced by the parser — those stay the model's job, unconditionally.

### 2. Generic retry-on-validation-failure

Every block streamed through `read-block-stream.ts` — diagram, chart,
table, callout, any of them — already runs through `prepare()` →
`validateDocJson` → `diagramError`/the schema's own validators. Today a
rejection is logged and the block is dropped (`read.skipped++`). This adds
one bounded repair attempt before giving up.

## Data flow

**Ascii-art diagram conversion (parser path):**

1. `useBlockAction.ts` fires with `surface: { kind: "block-action", family: "turn-into" }`. This design adds `actionId` to that variant (currently only `family` is carried) so the route can tell `into-diagram` apart from `into-table`/`into-steps`/etc.
2. `src/app/api/passage/route.ts`: when `actionId === "into-diagram"`, call `parseAsciiDiagram` on the source block's raw text.
   - `null` → build the prompt exactly as today.
   - a skeleton → the prompt states it verbatim: "use exactly these ids, labels, groups and edges — add only `kind`, `direction`, and per-node `accent`/`icon`." The model still emits the whole `::: diagram {...}` directive; the splitter, `beautify`, and validation are unchanged downstream. The model's job shrinks from "extract and decide" to "decide," which is what it was already failing at doing simultaneously.
3. Output validated exactly as today (plus the tightened rule below). Any remaining failure (model renamed an id, invented a node) is covered by the retry loop — the parser doesn't need to be perfect, it needs to remove the *common* failure.

**Retry loop (any block, any surface):**

1. `read-block-stream.ts`: `Read` gains a place to keep what failed, not just a count — `{ raw: string; error: string }[]` alongside the existing `skipped` counter.
2. `readAnswer` finishes reading the stream as today; nothing about the live streaming behavior changes — blocks that validate land immediately, in order, same as now.
3. `blockStreamResponse`, after `readAnswer` returns and before it enqueues the final `done` line: for each retriable entry, one blocking repair call (`stake: "block"`, low effort) — system: the same agent charter; prompt: the original instruction + the offending raw block + the exact validation error (already names the offending node/group, per `validation.ts`'s existing doc comment). The corrected block is validated the same way.
   - Passes → sent through the same `send()` the stream already uses, taking the position the failed block would have occupied.
   - Fails again → dropped for good, counted in `skipped`. No further retries (bounded to 1, matching the `maxRetries: 1` pattern already used at the HTTP layer in `deadline.ts`).
4. The `ReadableStream` stays open across this repair step; the client (`insertStreamedPassage`) is unaffected — it just receives the corrected block a little later, same `onBlock` callback, same insertion-order logic.

**Validation tightening:**

`group-tree.ts` (used by `groupsError` in `validation.ts`) gains one new
rule: a declared group with zero member nodes and zero child groups is
rejected. This is what makes the retry loop actually *trigger* on this
bug's exact shape — today `root-ns`/`dev-ns`/`uat-ns` (declared as groups
with nothing in them) pass validation cleanly, so nothing catches the
missing-parent chain until a human looks at the render.

**Prompt example:**

`prompts/blocks/layout.ts`'s diagram contract line gets one concrete
worked example showing a `parent` chain two levels deep. This is
best-effort, not a fix in itself — it helps the free-prompt case (no
ascii source, no parser assist) where the model has to invent nesting
from a text description with nothing to copy from.

## Error handling

- Parser ambiguity → `null` → unchanged today's path. Never a wrong guess presented as a confident structure.
- Repair call bounded to one extra request per failed block — typically zero per passage, occasionally one. Not an unbounded regeneration loop; the user never triggers it.
- A block that fails twice (original + repair) is dropped, same visible behavior as today (`skipped` count) — just now rarer, since the two changes remove the most common way to fail (missing parent) and the schema catches it earlier when it does happen.

## Testing

- `ascii-parse.test.ts`: this bug's exact drawing → asserts the correct `nodes`/`groups` (with `parent` chain)/`edges`; a prose paragraph → `null`; a drawing with unresolvable arrows or ambiguous nesting → `null`.
- `group-tree.test.ts` / `validation.test.ts`: a group with no members and no children is rejected; a group with a child group but no direct members still passes (a legitimate pure-container case, e.g. `g2` intermediate levels that *do* have a child).
- `read-block-stream.test.ts`: a fake stream/generator that fails validation once then succeeds on the repair call — asserts the corrected block lands in order and `skipped` stays 0; a fake that fails twice — asserts it's dropped and counted.
- `passage-request.test.ts` / route-level test: `actionId: "into-diagram"` with a parseable source enriches the prompt; a non-ascii source or a non-diagram action leaves the prompt unchanged.

## Files touched

- New: `src/domain/documents/diagram/ascii-parse.ts` (+ test)
- `src/domain/documents/diagram/group-tree.ts` (+ test) — dead-group rule
- `src/domain/authoring/prompts/blocks/layout.ts` — worked example
- `src/domain/authoring/agents/routing.ts` / `Surface` type — add `actionId` to the block-action variant
- `src/app/api/passage/route.ts` — parser invocation, prompt enrichment
- `src/lib/ai/read-block-stream.ts` (+ test) — retain failed blocks, expose them for repair
- `src/lib/ai/block-stream-response.ts` — post-stream repair pass before `done`
