import { callout, cardGrid, cover, doc, h, p, statRow, steps } from "./blocks";
import type { Template } from "./template";

export const projectOnePagerTemplate: Template = {
  id: "project-one-pager",
  label: "Project one-pager",
  description: "A single page selling the what, why and how of a project.",
  preset: "corporate",
  thumb: ["cover", "stats", "cards", "steps"],
  content: doc(
    cover(
      "Project one-pager",
      "The problem, the approach and what success looks like — on one page.",
      "Owner · Team · Quarter",
    ),
    p(
      "One paragraph a stakeholder can read in twenty seconds: what this project is, who it serves and why it matters now.",
    ),
    statRow(
      "row",
      { value: "6 weeks", label: "Time to first release", accent: "blue", icon: "clock" },
      { value: "3 teams", label: "People involved", accent: "purple", icon: "users" },
      {
        value: "€120k",
        label: "Expected yearly saving",
        accent: "green",
        trend: "good",
        icon: "money",
      },
    ),
    h(2, "Problem"),
    p(
      "What hurts today, for whom, and the cost of leaving it alone. Be concrete: a number beats an adjective.",
    ),
    h(2, "Approach"),
    cardGrid(
      {
        title: "Pillar one",
        body: "The first thing we build, and the part of the problem it removes.",
        accent: "blue",
        icon: "target",
      },
      {
        title: "Pillar two",
        body: "The second lever, and why it comes after the first.",
        accent: "green",
        icon: "zap",
      },
      {
        title: "Pillar three",
        body: "What makes the result stick once the project ends.",
        accent: "purple",
        icon: "shield",
      },
    ),
    h(2, "Risks"),
    callout("warn", p("The one risk that could sink this, and the mitigation already in motion.")),
    h(2, "Next steps"),
    steps(
      {
        title: "Confirm scope",
        body: "Agree with the sponsors on what is in and, above all, what is out.",
        accent: "blue",
      },
      {
        title: "Build the first slice",
        body: "Ship the smallest version that a real user can try.",
        accent: "green",
      },
      {
        title: "Measure and decide",
        body: "Compare against the target figures, then extend or stop.",
        accent: "purple",
      },
    ),
  ),
};
