import { AGENTS } from "@/domain/authoring/agents/catalog";
import { agentSystem } from "@/domain/authoring/prompts/agents";
import { transformOpsSystem } from "@/domain/authoring/prompts/transform";
import { layoutPlanSystem } from "@/domain/authoring/prompts/layout-plan";
import { StyleParameters } from "@/domain/authoring/style-parameters";

/**
 * Print the system prompts the assistants actually receive.
 *
 * A charter on its own says nothing about what a model reads: the prompt it is
 * sent is the format contract, plus this instance's style guide, plus the
 * charter, plus the task. Tuning one line of a charter without seeing that
 * assembly is guessing, so this prints the whole thing — and calls no model, so
 * it costs nothing to run between two edits.
 *
 *   npm run prompts
 *   npm run prompts -- --language=French --emoji
 *
 * The style flags stand in for Settings, which only the running app can read.
 */

function styleFromArgv(argv: string[]): StyleParameters {
  const language = argv.find((arg) => arg.startsWith("--language="))?.split("=")[1] ?? "";
  return StyleParameters.restore({
    language,
    emoji: argv.includes("--emoji"),
    autoBold: argv.includes("--auto-bold"),
  });
}

function section(title: string, body: string): void {
  const rule = "─".repeat(Math.max(0, 78 - title.length));
  console.log(`\n┌─ ${title} ${rule}\n`);
  console.log(body);
}

const style = styleFromArgv(process.argv.slice(2));

for (const agent of AGENTS) {
  section(
    `${agent.label.toUpperCase()} — charter only (temperature ${agent.temperature}, ${agent.scope} vocabulary)`,
    agent.charter(style),
  );
  section(
    `${agent.label.toUpperCase()} — as sent, editing a passage`,
    agentSystem(agent, style),
  );
  section(
    `${agent.label.toUpperCase()} — as sent, editing a whole document`,
    transformOpsSystem(style, agent),
  );
}

section(
  "LAYOUT PLANNER — as sent, deciding what a document should become",
  layoutPlanSystem(style),
);

console.log(
  `\nStyle used: language=${style.imposesLanguage ? "imposed" : "follows the request"}, emoji=${
    style.emoji ? "allowed" : "forbidden"
  }. Pass --language=… and --emoji to see the other wordings.\n`,
);
