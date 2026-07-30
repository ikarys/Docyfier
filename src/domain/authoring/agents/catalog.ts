import { designer } from "./designer";
import { writer } from "./writer";
import type { Agent, AgentId } from "./contract";

/**
 * Every assistant this build ships. The one place that knows the list: routing,
 * the use cases and the interface all read it from here, so a third assistant
 * is a file and a line.
 */
export const AGENTS: readonly Agent[] = [writer, designer];

export function agentById(id: AgentId): Agent {
  const agent = AGENTS.find((candidate) => candidate.id === id);
  // The id is a union of the ids declared above: a miss means the catalog and
  // the type disagree, which is a defect and not a runtime condition.
  if (!agent) throw new Error(`No assistant named ${id}`);
  return agent;
}
