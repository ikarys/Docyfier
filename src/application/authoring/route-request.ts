import {
  readAssignment,
  routeSurface,
  WRITER_ONLY,
  type Assignment,
  type Surface,
} from "@/domain/authoring/agents/routing";
import { ROUTER_SYSTEM, routerPrompt } from "@/domain/authoring/prompts";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { ModelUnavailable } from "@/domain/authoring/text-generator";
import type { AuthoringDeps } from "./deps";

/**
 * Who should answer this request (PLAN.md STEP U13).
 *
 * A surface that names its own assistant is answered without a model: routing a
 * "Turn into a table" through a call would spend seconds learning what the
 * catalog already states. The model is asked only for a free prompt, which is
 * the one request whose words are the only clue.
 */
export async function routeRequest(
  deps: AuthoringDeps,
  surface: Surface,
  instruction: string,
): Promise<Assignment> {
  const derived = routeSurface(surface);
  if (derived) return derived;

  try {
    const { text } = await deps.generator.generate({
      system: ROUTER_SYSTEM,
      prompt: routerPrompt(instruction),
      // Dispatching is not a creative act, and an unstable router would make
      // the same request behave differently twice.
      temperature: 0,
      shape: "free",
    });
    return readAssignment(jsonFromAnswer(text));
  } catch (err) {
    // An unreachable model is the surface's problem to report, not a reason to
    // route badly; anything else costs one assistant, not the request.
    if (err instanceof ModelUnavailable) throw err;
    return WRITER_ONLY;
  }
}
