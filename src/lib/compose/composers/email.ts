import { languageField, languageRule, revisionRule, section } from "../fields";
import {
  PLAIN_OUTPUT_RULES,
  type ComposeContext,
  type Composer,
  type ComposerChoice,
  type ComposerValues,
} from "../types";

/**
 * The email composer (PLAN.md STEP 8, vision #13) — write a professional email
 * from a brief, or rewrite one that already exists, in a chosen tone.
 */

/** A tone, and the instruction it becomes. One list drives both the field's
 * choices and the prompt, so a new tone is a single entry. */
interface Tone extends ComposerChoice {
  guide: string;
}

const TONES: Tone[] = [
  {
    value: "neutral",
    label: "Neutral",
    guide: "Plain and professional. No warmth, no stiffness, no filler.",
  },
  {
    value: "formal",
    label: "Formal",
    guide:
      "Formal register: full courtesy formulas, no contractions, no familiarity.",
  },
  {
    value: "friendly",
    label: "Friendly",
    guide:
      "Warm and personable while staying professional. Short, natural sentences.",
  },
  {
    value: "direct",
    label: "Direct",
    guide:
      "Get to the point in the first sentence. No preamble, no softening, no hedging.",
  },
  {
    value: "firm",
    label: "Firm",
    guide:
      "Assertive and unambiguous about what is expected and by when, while staying courteous. Never aggressive.",
  },
  {
    value: "apologetic",
    label: "Apologetic",
    guide:
      "Acknowledge the problem plainly, apologise once without grovelling, then move to what happens next.",
  },
  {
    value: "persuasive",
    label: "Persuasive",
    guide:
      "Lead with the benefit for the reader, back it with the concrete points from the input, close on a clear ask.",
  },
];

const LENGTHS: (ComposerChoice & { guide: string })[] = [
  {
    value: "short",
    label: "Short",
    guide: "Under 90 words: a greeting, two or three sentences, a sign-off.",
  },
  {
    value: "medium",
    label: "Medium",
    guide: "Around 120 to 200 words, in two or three short paragraphs.",
  },
  {
    value: "detailed",
    label: "Detailed",
    guide:
      "Up to 350 words. Group the content into short paragraphs, and use a bullet list for any genuine enumeration.",
  },
];

const SHAPE = `Shape of the answer:
- First line: "Subject: <subject line>", at most 70 characters, no trailing period.
- Then one blank line, then the email itself: greeting, body, sign-off.
- Short paragraphs separated by a blank line. Use "- " bullets only for a real
  enumeration (dates, options, action items).
- End on the sign-off line. Do not invent a sender name or a signature block:
  when no name is given, stop after the sign-off formula.`;

function guideOf(list: (ComposerChoice & { guide: string })[], value: string): string {
  return (list.find((entry) => entry.value === value) ?? list[0]).guide;
}

function choicesOf(list: ComposerChoice[]): ComposerChoice[] {
  return list.map(({ value, label }) => ({ value, label }));
}

export const emailComposer: Composer = {
  id: "email",
  label: "Email",
  description: "Write or rewrite a professional email in the tone you choose.",
  lede: "Describe what you want to say, or paste an email to rework.",
  instructions:
    "The first line is the subject; everything after the blank line is the body. Edit it here, then compose again to iterate on it.",
  outputField: "input",
  fields: [
    {
      id: "mode",
      label: "Task",
      type: "select",
      default: "write",
      choices: [
        { value: "write", label: "Write from a brief" },
        { value: "rewrite", label: "Rewrite an existing email" },
      ],
    },
    {
      id: "input",
      label: "Your brief, or the email to rewrite",
      type: "textarea",
      required: true,
      rows: 10,
      placeholder:
        "Ask the supplier to confirm the delivery date for order 4412, we need it before the 15th…",
      help: "Raw notes are fine. Everything factual in the answer comes from here.",
    },
    {
      id: "recipient",
      label: "Recipient",
      type: "text",
      placeholder: "my manager, a client, the support team…",
      help: "Optional. Sets how familiar or formal the address should be.",
    },
    {
      id: "tone",
      label: "Tone",
      type: "select",
      default: "neutral",
      choices: choicesOf(TONES),
    },
    {
      id: "length",
      label: "Length",
      type: "select",
      default: "medium",
      choices: choicesOf(LENGTHS),
    },
    languageField,
  ],

  build(values: ComposerValues, context: ComposeContext) {
    const rewriting = values.mode === "rewrite";
    // Iterating on an answer overrides the mode: whatever the user first asked
    // for, the field now holds an email, not a brief.
    const task = context.revising
      ? revisionRule(context)
      : rewriting
        ? `Task: rewrite the email below. Keep every fact, request and commitment it
already carries — change the wording, the structure and the tone, not the
substance. Drop what is redundant.`
        : `Task: write the email the brief below asks for.`;

    const system = `You write professional emails.

${PLAIN_OUTPUT_RULES}

${SHAPE}

Tone: ${guideOf(TONES, values.tone)}
Length: ${guideOf(LENGTHS, values.length)}
${languageRule(values.language)}

${task}`;

    const label = context.revising
      ? "Email to improve"
      : rewriting
        ? "Email to rewrite"
        : "Brief";

    const prompt = [
      section("Recipient", values.recipient),
      section(label, values.input),
    ]
      .filter(Boolean)
      .join("\n");

    return { system, prompt };
  },
};
