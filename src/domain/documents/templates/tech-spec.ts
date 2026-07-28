import { bullets, code, cover, doc, h, p, steps, table } from "./blocks";
import type { Template } from "./template";

export const techSpecTemplate: Template = {
  id: "tech-spec",
  label: "Technical spec",
  description: "Goals, design, alternatives and rollout for an engineering change.",
  preset: "minimal",
  thumb: ["title", "text", "table", "text"],
  content: doc(
    cover(
      "Technical specification",
      "What we are building, how it works and what we deliberately are not doing.",
      "Author · Status: draft · Date",
    ),
    { type: "tableOfContents" },
    h(2, "Context"),
    p("The system as it stands today, and the constraint that makes a change necessary."),
    h(2, "Goals and non-goals"),
    bullets(
      "Goal — the outcome this change must produce",
      "Goal — the property that must not regress",
    ),
    p(
      "Non-goals: what this change explicitly leaves for later, so reviewers stop looking for it.",
    ),
    h(2, "Design"),
    p("The proposed design in prose first: the components, who calls whom, and where the data lives."),
    code(
      "typescript",
      "// The contract at the heart of the change.\nexport interface Example {\n  id: string;\n}",
    ),
    h(2, "Alternatives considered"),
    table(
      ["Option", "Upside", "Why not"],
      ["Do nothing", "No work, no risk", "The constraint stays and gets worse"],
      ["Alternative design", "Simpler to build", "Does not hold at the expected volume"],
    ),
    h(2, "Rollout"),
    steps(
      {
        title: "Behind a flag",
        body: "Ship dark, exercise it with internal traffic only.",
        accent: "blue",
      },
      {
        title: "Progressive enable",
        body: "Ramp by cohort, with the rollback path documented.",
        accent: "green",
      },
    ),
    h(2, "Open questions"),
    bullets("Question still to settle, and who can settle it"),
  ),
};
