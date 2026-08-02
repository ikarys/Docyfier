import { caretPrompt, caretSystem } from "@/domain/authoring/prompts";
import { effortFor, tokensFor } from "@/domain/authoring/thinking";
import { blockStreamResponse } from "@/lib/ai/block-stream-response";
import { authoringDeps } from "@/lib/ai/service";
import { getStyleParameters } from "@/lib/settings";
import { isAuthorized } from "@/lib/auth";

/**
 * Surface 5, streaming (PLAN.md STEP U11) — what the model writes where the
 * caret is. Same NDJSON as the generation stream, one `{"block":…}` per
 * finished block, because the editor reads both with the same reader.
 *
 * The document itself never travels: the caller sends its digest and the text
 * the caret sits in. A provider that cannot stream fails before the response,
 * and the editor falls back to the blocking action.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { digest, here, instruction } = (await req.json()) as {
    digest?: unknown;
    here?: unknown;
    instruction?: unknown;
  };
  if (typeof instruction !== "string" || !instruction.trim()) {
    return Response.json({ error: "Missing instruction" }, { status: 400 });
  }

  const style = await getStyleParameters();
  const { generator } = await authoringDeps();
  return blockStreamResponse({
    system: caretSystem(style),
    prompt: caretPrompt(
      typeof digest === "string" ? digest : "",
      typeof here === "string" ? here : "",
      instruction,
    ),
    temperature: 0.6,
    // The user is watching this one land at their cursor.
    effort: effortFor("block"),
    maxTokens: tokensFor("block"),
    style,
    generator,
  });
}
