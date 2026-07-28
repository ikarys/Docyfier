import { callout, cardGrid, cover, doc, h, p, timeline } from "./blocks";
import type { Template } from "./template";

export const roadmapTemplate: Template = {
  id: "roadmap",
  label: "Roadmap",
  description: "Phased plan with themes, milestones and what is out of scope.",
  preset: "vivid",
  thumb: ["cover", "cards", "timeline", "callout"],
  content: doc(
    cover(
      "Roadmap",
      "What we are building, in what order, and why that order.",
      "Team · Horizon · Last updated",
    ),
    p("The thread running through the plan: the outcome all of these phases add up to."),
    h(2, "Themes"),
    cardGrid(
      {
        title: "Theme one",
        body: "The problem area this theme owns and the value it unlocks.",
        accent: "purple",
        icon: "star",
      },
      {
        title: "Theme two",
        body: "The second area, and how it builds on the first.",
        accent: "blue",
        icon: "target",
      },
      {
        title: "Theme three",
        body: "The long-horizon bet, kept deliberately vague for now.",
        accent: "green",
        icon: "globe",
      },
    ),
    h(2, "Phases"),
    timeline(
      {
        when: "Q1",
        title: "Foundations",
        body: "The unglamorous work everything else depends on.",
        accent: "blue",
      },
      {
        when: "Q2",
        title: "First release",
        body: "The slice that reaches real users and proves the value.",
        accent: "green",
      },
      {
        when: "Q3",
        title: "Scale",
        body: "Volume, reliability and the rough edges found in Q2.",
        accent: "purple",
      },
      {
        when: "Q4",
        title: "Expand",
        body: "The adjacent use case, once the core is stable.",
        accent: "yellow",
      },
    ),
    h(2, "Out of scope"),
    callout(
      "note",
      p("What this roadmap deliberately does not cover, so nobody plans against it."),
    ),
  ),
};
