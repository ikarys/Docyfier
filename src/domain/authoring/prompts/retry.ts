/** The one re-ask every surface shares: quote why the answer was rejected. */
export function retryPrompt(base: string, error: string): string {
  return `${base}\n\nYour previous answer was rejected: ${error}\nReturn corrected JSON only.`;
}
