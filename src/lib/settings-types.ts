/** Shared shape of the AI settings (importable from client components). */
export interface AiSettings {
  /** OpenAI-compatible endpoint, e.g. http://localhost:1234/v1 */
  baseUrl: string;
  /** Model id; empty string = auto-detect (first model on the server). */
  model: string;
  /** API key; LM Studio ignores it, other providers may require it. */
  apiKey: string;
  /** Max tokens the model may generate per response (whole-document edits need room). */
  maxOutputTokens: number;
  /** Ask the provider for JSON-schema-constrained output instead of parsing
   * fences and prose out of free text. Only some servers implement it. */
  structuredOutput: boolean;
}
