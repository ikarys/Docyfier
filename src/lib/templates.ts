import type { JSONContent } from "@tiptap/react";

/**
 * Document templates (PLAN.md STEP U5) — a starting point that already looks
 * like a finished document, so a new document is three clicks away.
 *
 * Content is ProseMirror JSON in the editor's own schema, exactly like AI
 * output; `src/lib/doc/templates-check.ts` validates every template against
 * that schema at build time, so a broken template can never reach a user.
 *
 * Client-safe: the gallery renders the metadata, the server action reads the
 * content. Thumbnails are declarative block shapes (`thumb`), never a live
 * editor render.
 */

/** The block shapes a thumbnail can draw — see `.tpl-thumb` in globals.css. */
export type ThumbBlock =
  | "cover"
  | "title"
  | "text"
  | "stats"
  | "cards"
  | "table"
  | "timeline"
  | "steps"
  | "chart"
  | "callout";

export interface Template {
  id: string;
  label: string;
  description: string;
  /** Theme preset the document starts with (see src/lib/themes.ts). */
  preset: string;
  thumb: ThumbBlock[];
  content: JSONContent;
}

/* --- Authoring helpers --------------------------------------------------- */

function text(value: string, marks?: JSONContent["marks"]): JSONContent {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

function badge(value: string, variant: string): JSONContent {
  return text(value, [{ type: "badge", attrs: { variant } }]);
}

function p(...inline: (string | JSONContent)[]): JSONContent {
  return {
    type: "paragraph",
    content: inline.map((i) => (typeof i === "string" ? text(i) : i)),
  };
}

function h(level: 1 | 2 | 3, value: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

function cover(title: string, subtitle: string, meta: string): JSONContent {
  return {
    type: "docCover",
    content: [
      h(1, title),
      { type: "coverLine", attrs: { variant: "subtitle" }, content: [text(subtitle)] },
      { type: "coverLine", attrs: { variant: "meta" }, content: [text(meta)] },
    ],
  };
}

function bullets(...items: string[]): JSONContent {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [p(item)] })),
  };
}

function numbered(...items: string[]): JSONContent {
  return {
    type: "orderedList",
    content: items.map((item) => ({ type: "listItem", content: [p(item)] })),
  };
}

function callout(variant: string, ...blocks: JSONContent[]): JSONContent {
  return { type: "callout", attrs: { variant }, content: blocks };
}

interface StatSpec {
  value: string;
  label: string;
  delta?: string;
  accent?: string;
  trend?: string;
  icon?: string;
}

function statRow(layout: "grid" | "row", ...stats: StatSpec[]): JSONContent {
  return {
    type: "statRow",
    content: stats.map((s) => ({
      type: "stat",
      attrs: {
        accent: s.accent ?? "blue",
        trend: s.trend ?? "flat",
        layout,
        ...(s.icon ? { icon: s.icon } : {}),
      },
      content: [p(s.value), p(s.label), ...(s.delta ? [p(s.delta)] : [])],
    })),
  };
}

function cardGrid(
  ...cards: { title: string; body: string; accent?: string; icon?: string }[]
): JSONContent {
  return {
    type: "cardGrid",
    attrs: { cols: cards.length },
    content: cards.map((c) => ({
      type: "card",
      attrs: { accent: c.accent ?? "none", ...(c.icon ? { icon: c.icon } : {}) },
      content: [h(3, c.title), p(c.body)],
    })),
  };
}

function timeline(
  ...items: { when: string; title: string; body: string; accent?: string }[]
): JSONContent {
  return {
    type: "timeline",
    content: items.map((i) => ({
      type: "timelineItem",
      attrs: { accent: i.accent ?? "blue" },
      content: [p(i.when), h(3, i.title), p(i.body)],
    })),
  };
}

function steps(
  ...items: { title: string; body: string; accent?: string }[]
): JSONContent {
  return {
    type: "stepList",
    content: items.map((s) => ({
      type: "step",
      attrs: { accent: s.accent ?? "blue" },
      content: [h(3, s.title), p(s.body)],
    })),
  };
}

/** First row is the header; every row must hold the same number of cells. */
function table(header: string[], ...rows: (string | JSONContent)[][]): JSONContent {
  const cell = (type: string, value: string | JSONContent): JSONContent => ({
    type,
    content: [typeof value === "string" ? p(value) : { type: "paragraph", content: [value] }],
  });
  return {
    type: "table",
    content: [
      { type: "tableRow", content: header.map((c) => cell("tableHeader", c)) },
      ...rows.map((row) => ({
        type: "tableRow",
        content: row.map((c) => cell("tableCell", c)),
      })),
    ],
  };
}

function doc(...blocks: JSONContent[]): JSONContent {
  return { type: "doc", content: blocks };
}

/* --- Templates ----------------------------------------------------------- */

export const TEMPLATES: readonly Template[] = [
  {
    id: "meeting-notes",
    label: "Meeting notes",
    description: "Attendees, agenda, decisions and action items with owners.",
    preset: "editorial",
    thumb: ["title", "text", "callout", "table"],
    content: doc(
      cover("Meeting notes", "What we discussed, decided and who does what next.", "Facilitator · Date · 30 min"),
      h(2, "Attendees"),
      p("Name — role · Name — role · Name — role"),
      h(2, "Agenda"),
      numbered(
        "Topic one — context and question to settle",
        "Topic two — options on the table",
        "Topic three — anything blocking the team",
      ),
      h(2, "Decisions"),
      callout("note", p("Decision: state what was agreed, in one sentence, so nobody has to reread the notes.")),
      p("Rationale: the reason the group landed there, and the option it beat."),
      h(2, "Action items"),
      table(
        ["Action", "Owner", "Due", "Status"],
        ["Write up the decision and share it", "Name", "This week", badge("In progress", "blue")],
        ["Prepare the follow-up analysis", "Name", "Next week", badge("Not started", "gray")],
        ["Unblock the dependency with the platform team", "Name", "Friday", badge("At risk", "yellow")],
      ),
      h(2, "Parked for later"),
      bullets(
        "Question raised but out of scope for this meeting",
        "Topic that needs an owner before it can be discussed",
      ),
    ),
  },
  {
    id: "project-one-pager",
    label: "Project one-pager",
    description: "A single page selling the what, why and how of a project.",
    preset: "corporate",
    thumb: ["cover", "stats", "cards", "steps"],
    content: doc(
      cover("Project one-pager", "The problem, the approach and what success looks like — on one page.", "Owner · Team · Quarter"),
      p("One paragraph a stakeholder can read in twenty seconds: what this project is, who it serves and why it matters now."),
      statRow(
        "row",
        { value: "6 weeks", label: "Time to first release", accent: "blue", icon: "clock" },
        { value: "3 teams", label: "People involved", accent: "purple", icon: "users" },
        { value: "€120k", label: "Expected yearly saving", accent: "green", trend: "good", icon: "money" },
      ),
      h(2, "Problem"),
      p("What hurts today, for whom, and the cost of leaving it alone. Be concrete: a number beats an adjective."),
      h(2, "Approach"),
      cardGrid(
        { title: "Pillar one", body: "The first thing we build, and the part of the problem it removes.", accent: "blue", icon: "target" },
        { title: "Pillar two", body: "The second lever, and why it comes after the first.", accent: "green", icon: "zap" },
        { title: "Pillar three", body: "What makes the result stick once the project ends.", accent: "purple", icon: "shield" },
      ),
      h(2, "Risks"),
      callout("warn", p("The one risk that could sink this, and the mitigation already in motion.")),
      h(2, "Next steps"),
      steps(
        { title: "Confirm scope", body: "Agree with the sponsors on what is in and, above all, what is out.", accent: "blue" },
        { title: "Build the first slice", body: "Ship the smallest version that a real user can try.", accent: "green" },
        { title: "Measure and decide", body: "Compare against the target figures, then extend or stop.", accent: "purple" },
      ),
    ),
  },
  {
    id: "tech-spec",
    label: "Technical spec",
    description: "Goals, design, alternatives and rollout for an engineering change.",
    preset: "minimal",
    thumb: ["title", "text", "table", "text"],
    content: doc(
      cover("Technical specification", "What we are building, how it works and what we deliberately are not doing.", "Author · Status: draft · Date"),
      { type: "tableOfContents" },
      h(2, "Context"),
      p("The system as it stands today, and the constraint that makes a change necessary."),
      h(2, "Goals and non-goals"),
      bullets(
        "Goal — the outcome this change must produce",
        "Goal — the property that must not regress",
      ),
      p("Non-goals: what this change explicitly leaves for later, so reviewers stop looking for it."),
      h(2, "Design"),
      p("The proposed design in prose first: the components, who calls whom, and where the data lives."),
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [text("// The contract at the heart of the change.\nexport interface Example {\n  id: string;\n}")],
      },
      h(2, "Alternatives considered"),
      table(
        ["Option", "Upside", "Why not"],
        ["Do nothing", "No work, no risk", "The constraint stays and gets worse"],
        ["Alternative design", "Simpler to build", "Does not hold at the expected volume"],
      ),
      h(2, "Rollout"),
      steps(
        { title: "Behind a flag", body: "Ship dark, exercise it with internal traffic only.", accent: "blue" },
        { title: "Progressive enable", body: "Ramp by cohort, with the rollback path documented.", accent: "green" },
      ),
      h(2, "Open questions"),
      bullets("Question still to settle, and who can settle it"),
    ),
  },
  {
    id: "status-report",
    label: "Status report",
    description: "Period metrics, highlights, risks and what comes next.",
    preset: "corporate",
    thumb: ["cover", "stats", "chart", "table"],
    content: doc(
      cover("Status report", "Where the project stands, what moved and what needs a decision.", "Owner · Period · Audience"),
      p("Headline: one sentence a busy reader can stop at."),
      statRow(
        "grid",
        { value: "82%", label: "Scope delivered", delta: "+12 pts", accent: "green", trend: "good" },
        { value: "4", label: "Open risks", delta: "+1", accent: "yellow", trend: "bad" },
        { value: "1.4 s", label: "Median response time", delta: "−0.3 s", accent: "blue", trend: "good" },
      ),
      h(2, "Progress"),
      {
        type: "chart",
        attrs: {
          kind: "bar",
          categories: ["Week 1", "Week 2", "Week 3", "Week 4"],
          series: [{ label: "Items completed", values: [4, 7, 6, 11] }],
          title: "Delivery per week",
          caption: "Replace with your own figures.",
          showGrid: true,
          showLegend: true,
        },
      },
      h(2, "Highlights"),
      cardGrid(
        { title: "Shipped", body: "What reached users this period, and the effect it had.", accent: "green", icon: "check" },
        { title: "In flight", body: "What is being built right now, and when it lands.", accent: "blue", icon: "rocket" },
      ),
      h(2, "Risks"),
      table(
        ["Risk", "Impact", "Owner", "Status"],
        ["Dependency not yet confirmed", "Delays the release by two weeks", "Name", badge("At risk", "yellow")],
        ["Capacity below plan", "Scope has to shrink", "Name", badge("Blocked", "red")],
      ),
      h(2, "Next period"),
      bullets(
        "The one outcome to reach next",
        "The decision needed from the steering group",
      ),
    ),
  },
  {
    id: "roadmap",
    label: "Roadmap",
    description: "Phased plan with themes, milestones and what is out of scope.",
    preset: "vivid",
    thumb: ["cover", "cards", "timeline", "callout"],
    content: doc(
      cover("Roadmap", "What we are building, in what order, and why that order.", "Team · Horizon · Last updated"),
      p("The thread running through the plan: the outcome all of these phases add up to."),
      h(2, "Themes"),
      cardGrid(
        { title: "Theme one", body: "The problem area this theme owns and the value it unlocks.", accent: "purple", icon: "star" },
        { title: "Theme two", body: "The second area, and how it builds on the first.", accent: "blue", icon: "target" },
        { title: "Theme three", body: "The long-horizon bet, kept deliberately vague for now.", accent: "green", icon: "globe" },
      ),
      h(2, "Phases"),
      timeline(
        { when: "Q1", title: "Foundations", body: "The unglamorous work everything else depends on.", accent: "blue" },
        { when: "Q2", title: "First release", body: "The slice that reaches real users and proves the value.", accent: "green" },
        { when: "Q3", title: "Scale", body: "Volume, reliability and the rough edges found in Q2.", accent: "purple" },
        { when: "Q4", title: "Expand", body: "The adjacent use case, once the core is stable.", accent: "yellow" },
      ),
      h(2, "Out of scope"),
      callout("note", p("What this roadmap deliberately does not cover, so nobody plans against it.")),
    ),
  },
  {
    id: "incident-postmortem",
    label: "Incident postmortem",
    description: "Blameless writeup: impact, timeline, root cause, corrective actions.",
    preset: "editorial",
    thumb: ["title", "callout", "timeline", "table"],
    content: doc(
      cover("Incident postmortem", "What happened, why, and what stops it happening again.", "Author · Incident date · Severity"),
      callout("danger", p("Impact in one sentence: who was affected, how badly, for how long.")),
      statRow(
        "grid",
        { value: "42 min", label: "Time to detect", accent: "yellow", icon: "clock" },
        { value: "1 h 18", label: "Total downtime", accent: "red", trend: "bad", icon: "alert" },
        { value: "3%", label: "Requests failed", accent: "blue" },
      ),
      h(2, "Timeline"),
      timeline(
        { when: "09:12", title: "Trigger", body: "The change or event that started it.", accent: "yellow" },
        { when: "09:54", title: "Detection", body: "How we found out — alert, or a customer telling us.", accent: "red" },
        { when: "10:30", title: "Mitigation", body: "The action that stopped the bleeding.", accent: "blue" },
        { when: "11:12", title: "Recovery", body: "Service back to normal, confirmed by which signal.", accent: "green" },
      ),
      h(2, "Root cause"),
      p("The chain of causes, written without naming a culprit: what in the system allowed a routine action to break production."),
      h(2, "What went well / what did not"),
      {
        type: "columnList",
        content: [
          { type: "column", content: [h(3, "Went well"), bullets("The thing that worked", "The safeguard that held")] },
          { type: "column", content: [h(3, "Went badly"), bullets("The gap that cost us time", "The signal nobody saw")] },
        ],
      },
      h(2, "Corrective actions"),
      table(
        ["Action", "Owner", "Due", "Status"],
        ["Close the gap that allowed the failure", "Name", "Two weeks", badge("In progress", "blue")],
        ["Add the alert that was missing", "Name", "This week", badge("Done", "green")],
      ),
    ),
  },
  {
    id: "decision-note",
    label: "Decision note",
    description: "One decision, its options, the call and its consequences.",
    preset: "editorial",
    thumb: ["title", "callout", "cards", "text"],
    content: doc(
      cover("Decision note", "The question, the options weighed, and the call.", "Decider · Date · Status: proposed"),
      callout("note", p("Decision: the call, stated in one sentence, up front.")),
      h(2, "Context"),
      p("What forced a decision now, and the constraints anyone revisiting it must respect."),
      h(2, "Options"),
      cardGrid(
        { title: "Option A", body: "What it is, what it costs, and the risk it carries.", accent: "blue" },
        { title: "Option B", body: "The alternative, and where it beats option A.", accent: "green" },
        { title: "Option C", body: "The status quo — always worth pricing explicitly.", accent: "none" },
      ),
      h(2, "Decision"),
      p("The option chosen and the criterion that decided it — cost, risk, time, or reversibility."),
      h(2, "Consequences"),
      bullets(
        "What becomes easy once this is in place",
        "What becomes harder, accepted knowingly",
        "The signal that would tell us to revisit this",
      ),
    ),
  },
] as const;

export function findTemplate(id: unknown): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
