/**
 * Surface 6 — a question about the document (PLAN.md STEP U11).
 *
 * No format contract and no style guide here: this answer is read, never
 * rendered, and the model must not be tempted to write a document when it was
 * asked a question. Nothing it says reaches the document until someone asks
 * for it to be inserted.
 */

export const QUESTION_SYSTEM = `You answer questions about a document you are given a digest of.
Answer ONLY from that digest. If it does not say, answer that the document does not say — never guess and never invent a figure.
Reply with JSON: {"answer": "…", "sections": ["…"]}. "answer" is plain prose, a few sentences at most, in the language of the document. "sections" names the headings your answer came from, exactly as they appear, and is empty when the answer came from no section in particular.`;

export function questionPrompt(digest: string, question: string): string {
  return `Document:\n"""\n${digest}\n"""\n\nQuestion: ${question}`;
}
