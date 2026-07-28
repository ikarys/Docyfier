import { bullets, callout, cardGrid, cover, doc, h, p } from "./blocks";
import type { Template } from "./template";

export const decisionNoteTemplate: Template = {
  id: "decision-note",
  label: "Decision note",
  description: "One decision, its options, the call and its consequences.",
  preset: "editorial",
  thumb: ["title", "callout", "cards", "text"],
  content: doc(
    cover(
      "Decision note",
      "The question, the options weighed, and the call.",
      "Decider · Date · Status: proposed",
    ),
    callout("note", p("Decision: the call, stated in one sentence, up front.")),
    h(2, "Context"),
    p("What forced a decision now, and the constraints anyone revisiting it must respect."),
    h(2, "Options"),
    cardGrid(
      {
        title: "Option A",
        body: "What it is, what it costs, and the risk it carries.",
        accent: "blue",
      },
      { title: "Option B", body: "The alternative, and where it beats option A.", accent: "green" },
      { title: "Option C", body: "The status quo — always worth pricing explicitly." },
    ),
    h(2, "Decision"),
    p("The option chosen and the criterion that decided it — cost, risk, time, or reversibility."),
    h(2, "Consequences"),
    bullets(
      "What becomes easy once this is in place",
      "What becomes harder, accepted knowingly",
      "The signal that would tell us to revisit this",
    ),
  ),
};
