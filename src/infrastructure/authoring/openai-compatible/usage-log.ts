/**
 * What a model call actually cost, in tokens and in seconds.
 *
 * Written because the two are not the same thing and only one of them is
 * visible: an answer of 1 100 tokens that took 80 seconds spent most of that
 * time reasoning, and nothing in the answer says so. Without this line, "the AI
 * is slow" cannot be told apart from "the model thinks before it writes", and
 * the fix for one is not the fix for the other.
 *
 * Off unless `DOCYFIER_LOG_USAGE` is set: this is a number for whoever is
 * tuning prompts or comparing providers, not for a running instance's logs.
 */

export interface CallUsage {
  inputTokens?: number;
  outputTokens?: number;
  /** Tokens spent thinking, when the provider declares them. */
  reasoningTokens?: number;
  /**
   * Tokens the provider served from a prompt it had already seen. The format
   * contract is the same bytes on every call, so this is what says whether it
   * is still being paid for or only sent.
   */
  cachedTokens?: number;
}

export function usageLoggingEnabled(): boolean {
  return Boolean(process.env.DOCYFIER_LOG_USAGE);
}

/** Read the usage off whatever shape the SDK or the provider handed back. */
export function readUsage(value: unknown): CallUsage {
  const usage = (value ?? {}) as Record<string, unknown>;
  const details = (usage.completionTokensDetails ?? {}) as Record<string, unknown>;
  const count = (...candidates: unknown[]): number | undefined => {
    const found = candidates.find((candidate) => typeof candidate === "number");
    return typeof found === "number" ? found : undefined;
  };
  const prompt = (usage.promptTokensDetails ?? {}) as Record<string, unknown>;
  return {
    inputTokens: count(usage.inputTokens, usage.promptTokens),
    outputTokens: count(usage.outputTokens, usage.completionTokens),
    reasoningTokens: count(usage.reasoningTokens, details.reasoningTokens),
    cachedTokens: count(usage.cachedInputTokens, prompt.cachedTokens, usage.cacheReadInputTokens),
  };
}

/** Roughly how many tokens a run of model-written text was, for a gap nobody declared. */
const CHARS_PER_TOKEN = 4;

/** What this process actually read off the stream, as opposed to what it was billed. */
export interface AnswerSize {
  /** Characters of answer — the text the surface will use. */
  chars: number;
  /** Characters of reasoning the model streamed on its way there. */
  thinking: number;
}

/**
 * What the answer cost against what arrived. A provider that bills 47 000
 * output tokens and hands back 5 000 tokens of text spent the difference
 * thinking, whatever it says in `usage` — and that difference decides whether
 * the wait is worth attacking through the format or through the effort.
 */
function answerParts(usage: CallUsage, answer: AnswerSize): string[] {
  const written = Math.round(answer.chars / CHARS_PER_TOKEN);
  const parts = [`answer ${answer.chars} chars`, `~${written} tok`];
  if (answer.thinking > 0) {
    parts.push(
      `thinking ${answer.thinking} chars`,
      `~${Math.round(answer.thinking / CHARS_PER_TOKEN)} tok`,
    );
  }
  const billed = usage.outputTokens ?? 0;
  if (billed > written) parts.push(`${billed - written} unwritten`);
  return parts;
}

export function usageLine(
  label: string,
  ms: number,
  usage: CallUsage,
  /** What this process read off the stream; absent on a call that did not stream. */
  answer?: AnswerSize,
): string {
  const seconds = ms / 1000;
  const parts = [`[ai] ${label} ${seconds.toFixed(1)}s`];

  if (usage.inputTokens !== undefined) parts.push(`in ${usage.inputTokens}`);
  if (usage.cachedTokens !== undefined) {
    parts.push(`cached ${usage.cachedTokens}`);
    const sent = usage.inputTokens ?? 0;
    if (sent > 0) parts.push(`${Math.round((usage.cachedTokens / sent) * 100)}% reused`);
  }
  if (usage.outputTokens !== undefined) {
    parts.push(`out ${usage.outputTokens}`);
    // Guard the division rather than the caller: a cached answer really can
    // come back in the same millisecond it was asked for.
    if (seconds > 0) parts.push(`${Math.round(usage.outputTokens / seconds)} tok/s`);
  }
  if (usage.reasoningTokens !== undefined) {
    parts.push(`reasoning ${usage.reasoningTokens}`);
    const written = usage.outputTokens ?? 0;
    const total = written + usage.reasoningTokens;
    if (total > 0) parts.push(`${Math.round((usage.reasoningTokens / total) * 100)}% thinking`);
  }
  if (answer) parts.push(...answerParts(usage, answer));
  if (usage.inputTokens === undefined && usage.outputTokens === undefined) {
    parts.push("no usage reported");
  }
  return parts.join(" · ");
}

/** Print the line, when the environment asked for it. */
export function logUsage(
  label: string,
  startedAt: number,
  usage: unknown,
  answer?: AnswerSize,
): void {
  if (!usageLoggingEnabled()) return;
  console.info(usageLine(label, Date.now() - startedAt, readUsage(usage), answer));
}
