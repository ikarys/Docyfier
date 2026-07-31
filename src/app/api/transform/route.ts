import { agentById } from "@/domain/authoring/agents/catalog";
import { routeSurface, type Surface } from "@/domain/authoring/agents/routing";
import { blocksOf, type DocumentBody } from "@/domain/documents/body";
import { isAuthorized } from "@/lib/auth";
import { ndjsonResponse } from "@/lib/ai/ndjson";
import { modelOpLines } from "@/lib/ai/one-call-transform";
import { plannedOpLines } from "@/lib/ai/planned-transform";
import { authoringDeps } from "@/lib/ai/service";

/**
 * Surface 2, streaming — a whole-document edit, one NDJSON `{"op":…}` line per
 * operation, then a terminal `{"done":…}` or `{"error":…}`.
 *
 * The blocking action is still there and still correct; what it cannot do is
 * stay silent for minutes on a long document without a proxy between browser
 * and app closing the connection. Here the first bytes leave immediately and a
 * `{"beat":true}` goes out every few seconds while the model thinks, so the
 * only clock that can end the request is the silence limit.
 *
 * Two ways to reach the same lines, and which one runs is decided by what the
 * assistant has to do rather than by the size of the document. Laying a
 * document out means choosing what deserves a richer block, which a model does
 * by deliberating over everything at once — measured at 84% of the answer — so
 * that assistant plans first and produces the spans separately. Rewording has
 * no such choice to make: the words have to be read either way, and one call
 * says it.
 */

interface TransformRequest {
  content?: DocumentBody;
  instruction?: string;
  /** What the user did, so the assistant is chosen without a second call. */
  surface?: Surface;
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) return new Response("Unauthorized", { status: 401 });

  const { content, instruction, surface } = (await req.json()) as TransformRequest;
  if (!content || typeof content !== "object" || !Array.isArray(content.content)) {
    return Response.json({ error: "Missing document" }, { status: 400 });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return Response.json({ error: "Missing instruction" }, { status: 400 });
  }

  const authoring = await authoringDeps();
  const blocks = blocksOf(content);
  // One assistant per stream: a button already says which one, and a request
  // that wants both is answered by the writer here — laying the result out is
  // the next thing the user asks for, on a document that has settled.
  const assignment = routeSurface(surface ?? { kind: "free-prompt" });
  const agent = agentById(assignment.steps[0] ?? "writer");

  return ndjsonResponse(
    agent.id === "designer"
      ? plannedOpLines(authoring, blocks, instruction)
      : await modelOpLines(authoring, blocks, instruction, agent),
  );
}
