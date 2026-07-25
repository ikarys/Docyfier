/**
 * Client half of streaming prompt-to-document (PLAN.md STEP U4).
 *
 * The home hero creates an empty document and navigates to the editor, which
 * then runs the generation. The prompt is handed over through sessionStorage
 * rather than a query parameter or the document record: prompts are long,
 * belong to neither the URL nor the saved document, and must not survive the
 * navigation twice.
 */

const PROMPT_PREFIX = "docyfier:generate:";
const ERROR_KEY = "docyfier:generate-error";

function read(key: string): string | null {
  try {
    const value = window.sessionStorage.getItem(key);
    if (value !== null) window.sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode or quota: generation simply does not start on arrival.
  }
}

export const stashPrompt = (id: string, prompt: string): void =>
  write(PROMPT_PREFIX + id, prompt);

/** The pending prompt for this document, consumed on read. */
export const takePrompt = (id: string): string | null => read(PROMPT_PREFIX + id);

/** Report an aborted generation to the home page we are about to return to. */
export const stashGenerateError = (message: string): void => write(ERROR_KEY, message);

export const takeGenerateError = (): string | null => read(ERROR_KEY);

/** Yield each parsed line of an NDJSON response body. */
export async function* ndjsonLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let rest = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    rest += decoder.decode(value, { stream: true });
    const lines = rest.split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as Record<string, unknown>;
    }
  }
  if (rest.trim()) yield JSON.parse(rest) as Record<string, unknown>;
}
