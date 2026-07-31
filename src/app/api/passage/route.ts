import { agentById } from "@/domain/authoring/agents/catalog";
import { charterBreach } from "@/domain/authoring/agents/charter-breach";
import { routeSurface, type Surface } from "@/domain/authoring/agents/routing";
import { agentSystem, selectionBlocksPrompt } from "@/domain/authoring/prompts";
import type { DocumentNode } from "@/domain/documents/body";
import { blockStreamResponse } from "@/lib/ai/block-stream-response";
import { isAuthorized } from "@/lib/auth";
import { getStyleParameters } from "@/lib/settings";

/**
 * Surface 3a, streaming — a selection rewritten block by block.
 *
 * The blocking action is still there and is still what answers when a provider
 * cannot stream, exactly as the caret surface has always worked. What it cannot
 * do is show anything for the whole length of the call, and a passage edit is
 * the shortest wait in the product: the one a writer notices most.
 *
 * The charter each assistant is held to (PLAN.md STEP U13) cannot be checked
 * per block — it compares the whole answer to the passage it replaced — so it
 * runs as the stream's verdict. There is no retry there, which is the cost of
 * streaming this surface: a breach ends the stream as an error and the editor
 * puts the passage back.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) return new Response("Unauthorized", { status: 401 });

  const { blocks, instruction, surface } = (await req.json()) as {
    blocks?: unknown;
    instruction?: unknown;
    surface?: Surface;
  };
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return Response.json({ error: "Missing passage" }, { status: 400 });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return Response.json({ error: "Missing instruction" }, { status: 400 });
  }

  const passage = blocks as DocumentNode[];
  const assignment = routeSurface(surface ?? { kind: "free-prompt" });
  const agent = agentById(assignment.steps[0] ?? "writer");
  const style = await getStyleParameters();

  return blockStreamResponse({
    system: agentSystem(agent, style),
    prompt: selectionBlocksPrompt(passage, instruction),
    temperature: agent.temperature,
    effort: agent.effort,
    style,
    // Said before the first block, so the user reads who is working while they work.
    prelude: { reason: assignment.reason },
    verdict: (written) => charterBreach(agent, passage, written),
  });
}
