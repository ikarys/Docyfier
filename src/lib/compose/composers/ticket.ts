import { languageField, languageRule, revisionRule, section } from "../fields";
import {
  MARKDOWN_OUTPUT_RULES,
  type ComposeContext,
  type ComposeFormat,
  type Composer,
  type ComposerChoice,
  type ComposerValues,
} from "../types";

/**
 * The ticket composer (PLAN.md STEP 8, vision #14) — turn raw notes into a
 * ticket written the way one tracker expects it.
 *
 * The target tool is a field rather than three composers: the questions asked
 * of the user are the same everywhere, only the markup and the section names
 * differ. Each format is one entry in `FORMATS`, so supporting another tracker
 * means adding an entry, not a route.
 *
 * The model never writes a tracker's markup — it writes Markdown, and the
 * Copy button converts. That keeps one output contract, and it is what lets the
 * answer be edited as a rendered document instead of as raw `h2.` lines.
 */

interface TicketFormat extends ComposerChoice {
  /** The markup this tracker's description field reads, produced on copy. */
  format: ComposeFormat;
  /** The sections to emit, in order, and what belongs in each. */
  sections: string;
  /** Where the first line of the answer goes in that tool. */
  titleField: string;
}

const FORMATS: TicketFormat[] = [
  {
    value: "jira",
    label: "Jira",
    titleField: "Jira's Summary field",
    format: "jira",
    sections: `## Context
## Steps to reproduce   (numbered, only for a defect)
## Expected result
## Actual result        (only for a defect)
## Acceptance criteria  (a "- " list, each item verifiable)
## Notes                (impact, workaround, links — only when the input gives some)`,
  },
  {
    value: "servicenow",
    label: "ServiceNow",
    titleField: "the Short description field",
    format: "text",
    sections: `## Description
## Steps to reproduce   (numbered, only for a defect)
## Expected behaviour
## Actual behaviour     (only for a defect)
## Business impact      (who is blocked, and from doing what)
## Workaround           (or "None known")
## Suggested category   (one short line)`,
  },
  {
    value: "gitlab",
    label: "GitLab issue",
    titleField: "the issue title",
    format: "markdown",
    sections: `## Summary
## Steps to reproduce   (numbered, only for a defect)
## Expected behaviour
## Actual behaviour     (only for a defect)
## Acceptance criteria  (a "- " list, each item verifiable)
## Notes                (impact, workaround, links — only when the input gives some)`,
  },
];

const KINDS: (ComposerChoice & { guide: string })[] = [
  {
    value: "bug",
    label: "Bug",
    guide:
      "A defect: what was expected, what happened instead, and how to reproduce it. Report symptoms, never a diagnosis the input does not support.",
  },
  {
    value: "incident",
    label: "Incident",
    guide:
      "A live incident: what is broken, since when, who is affected, and what has already been tried. Lead with the impact.",
  },
  {
    value: "feature",
    label: "Feature / story",
    guide:
      "A capability to build. State the user, the need and the value, then the acceptance criteria. Do not design the solution unless the input does.",
  },
  {
    value: "task",
    label: "Task",
    guide:
      "A unit of work to carry out. State the outcome and how it will be recognised as done.",
  },
];

const PRIORITIES: ComposerChoice[] = [
  { value: "unset", label: "Not specified" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function formatOf(value: string): TicketFormat {
  return FORMATS.find((format) => format.value === value) ?? FORMATS[0];
}

function kindGuide(value: string): string {
  return (KINDS.find((kind) => kind.value === value) ?? KINDS[0]).guide;
}

function choicesOf(list: ComposerChoice[]): ComposerChoice[] {
  return list.map(({ value, label }) => ({ value, label }));
}

export const ticketComposer: Composer = {
  id: "ticket",
  label: "Ticket",
  description:
    "Turn rough notes into a ticket in the markup Jira, ServiceNow or GitLab expects.",
  lede: "Describe what happened or what you need; pick the tracker it goes into.",
  instructions:
    "The first line is the ticket title; everything below it is the description. Edit it here, then compose again to iterate on it. Copy converts it to the markup the tracker reads.",
  outputField: "context",
  // Each tracker's description field reads its own markup; the answer is
  // converted to it on copy, never written in it.
  clipboard: {
    default: "markdown",
    field: "tool",
    by: Object.fromEntries(FORMATS.map((f) => [f.value, f.format])),
  },
  fields: [
    {
      id: "tool",
      label: "Tracker",
      type: "select",
      default: "jira",
      choices: choicesOf(FORMATS),
      help: "Decides the markup of the description, not just the wording.",
    },
    {
      id: "kind",
      label: "Ticket type",
      type: "select",
      default: "bug",
      choices: choicesOf(KINDS),
    },
    {
      id: "context",
      label: "What happened, or what you need",
      type: "textarea",
      required: true,
      rows: 10,
      placeholder:
        "Export button on the invoice page does nothing since this morning, console shows a 500 on /api/invoices/export, only on Firefox…",
      help: "Raw notes, logs, error messages. Everything factual comes from here.",
    },
    {
      id: "title",
      label: "Title",
      type: "text",
      placeholder: "Leave empty to have one written from your notes",
      help: "Optional.",
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      default: "unset",
      choices: PRIORITIES,
    },
    languageField,
  ],

  build(values: ComposerValues, context: ComposeContext) {
    const format = formatOf(values.tool);
    const priority =
      values.priority === "unset"
        ? "- No priority was given: do not state one anywhere."
        : `- End the description with a last line reading exactly "Priority: ${values.priority}". Let that urgency show in the wording, without dramatising.`;

    const system = `You turn raw notes into a well-formed ticket for ${format.label}.

${MARKDOWN_OUTPUT_RULES}
- Report only what the notes support. No root cause, no fix, no estimate, no
  assignee unless the notes give one.

Shape of the answer:
- First line: "Title: <one-line ticket title>", at most 80 characters, no
  trailing period. It names the observable problem or the outcome wanted, never
  a guessed cause. It goes in ${format.titleField}.
- Then one blank line, then the description.
- Emit only the sections the notes actually support, in this order, and drop the
  ones you would have to invent:
${format.sections}
${priority}

Ticket type: ${kindGuide(values.kind)}
${languageRule(values.language)}

${context.revising ? revisionRule(context) : "Task: write that ticket from the notes below."}`;

    const prompt = [
      section("Suggested title", values.title),
      section(context.revising ? "Ticket to improve" : "Notes", values.context),
    ]
      .filter(Boolean)
      .join("\n");

    return { system, prompt, temperature: 0.3 };
  },
};
