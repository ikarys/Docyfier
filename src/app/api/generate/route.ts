import { themeFromArt } from "@/application/documents/theme-from-art";
import { writerSystem } from "@/domain/authoring/prompts";
import { DEFAULT_RECIPE, findRecipe } from "@/domain/authoring/recipes/catalog";
import { blockStreamResponse } from "@/lib/ai/block-stream-response";
import { planDocument } from "@/lib/ai/service";
import { getStyleParameters } from "@/lib/settings";
import { isAuthorized } from "@/lib/auth";

/**
 * Surface 1, streaming (PLAN.md STEP U4). Emits NDJSON: one `{"block":…}` line
 * per finished top-level block, then a terminal `{"done":…}` or `{"error":…}`.
 *
 * The reading of that stream is `block-stream-response.ts`, shared with the
 * caret surface; what belongs here is only what makes this generation this
 * one — the plan, the recipe it chose, and the dress that goes out first.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { prompt } = (await req.json()) as { prompt?: unknown };
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  // The plan comes first and blocks: what the document is decides the prompt
  // the writing stream is opened with. It is one short call, and a model that
  // cannot produce it hands back the default brief rather than failing.
  const brief = await planDocument(prompt);
  const recipe = findRecipe(brief.kind) ?? DEFAULT_RECIPE;
  const style = await getStyleParameters();
  // The dress before the first block: the document is styled while it is still
  // being written, rather than changing look once it is done.
  const theme = themeFromArt(brief.art);

  return blockStreamResponse({
    system: writerSystem(recipe, brief, style),
    prompt,
    temperature: 0.7,
    style,
    ...(theme ? { prelude: { theme } } : {}),
  });
}
