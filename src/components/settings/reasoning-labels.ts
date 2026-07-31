import { REASONING_EFFORTS, type ReasoningEffort } from "@/domain/configuration/ai-provider";

/**
 * What each thinking setting is called on screen, and what choosing it does.
 *
 * The vocabulary is the domain's; the wording is not, which is why it lives
 * here. It is a table rather than a conditional because the bug it exists to
 * stop already happened once: "off" was added to the domain list and reached
 * the settings page as the bare word "off", next to help text claiming a server
 * that does not support the setting simply ignores it. One does not — it stalls
 * — and that sentence cost an evening.
 */

interface EffortChoice {
  readonly label: string;
  /** Shown as the option's tooltip: what this choice costs or buys. */
  readonly hint: string;
}

const CHOICES: Record<ReasoningEffort, EffortChoice> = {
  default: {
    label: "Model's own default",
    hint: "Send nothing unless a surface asks for less — a rewrite asks for little, a whole-document plan for more.",
  },
  off: {
    label: "Off — never send the setting",
    hint: "Send no thinking setting on any call. Pick this if answers stall or never arrive: some servers hang on the field rather than ignoring it.",
  },
  minimal: { label: "Minimal", hint: "The least thinking the model offers." },
  low: { label: "Low", hint: "Enough for a rewrite; too little to plan a document." },
  medium: { label: "Medium", hint: "What a whole-document edit is worth." },
  high: { label: "High", hint: "Slowest. Rarely worth it for formatting work." },
};

export function effortChoices(): (EffortChoice & { value: ReasoningEffort })[] {
  return REASONING_EFFORTS.map((value) => ({ value, ...CHOICES[value] }));
}
