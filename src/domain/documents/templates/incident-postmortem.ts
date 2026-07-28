import {
  badge,
  bullets,
  callout,
  columns,
  cover,
  doc,
  h,
  p,
  statRow,
  table,
  timeline,
} from "./blocks";
import type { Template } from "./template";

export const incidentPostmortemTemplate: Template = {
  id: "incident-postmortem",
  label: "Incident postmortem",
  description: "Blameless writeup: impact, timeline, root cause, corrective actions.",
  preset: "editorial",
  thumb: ["title", "callout", "timeline", "table"],
  content: doc(
    cover(
      "Incident postmortem",
      "What happened, why, and what stops it happening again.",
      "Author · Incident date · Severity",
    ),
    callout("danger", p("Impact in one sentence: who was affected, how badly, for how long.")),
    statRow(
      "grid",
      { value: "42 min", label: "Time to detect", accent: "yellow", icon: "clock" },
      { value: "1 h 18", label: "Total downtime", accent: "red", trend: "bad", icon: "alert" },
      { value: "3%", label: "Requests failed", accent: "blue" },
    ),
    h(2, "Timeline"),
    timeline(
      {
        when: "09:12",
        title: "Trigger",
        body: "The change or event that started it.",
        accent: "yellow",
      },
      {
        when: "09:54",
        title: "Detection",
        body: "How we found out — alert, or a customer telling us.",
        accent: "red",
      },
      {
        when: "10:30",
        title: "Mitigation",
        body: "The action that stopped the bleeding.",
        accent: "blue",
      },
      {
        when: "11:12",
        title: "Recovery",
        body: "Service back to normal, confirmed by which signal.",
        accent: "green",
      },
    ),
    h(2, "Root cause"),
    p(
      "The chain of causes, written without naming a culprit: what in the system allowed a routine action to break production.",
    ),
    h(2, "What went well / what did not"),
    columns(
      [h(3, "Went well"), bullets("The thing that worked", "The safeguard that held")],
      [h(3, "Went badly"), bullets("The gap that cost us time", "The signal nobody saw")],
    ),
    h(2, "Corrective actions"),
    table(
      ["Action", "Owner", "Due", "Status"],
      [
        "Close the gap that allowed the failure",
        "Name",
        "Two weeks",
        badge("In progress", "blue"),
      ],
      ["Add the alert that was missing", "Name", "This week", badge("Done", "green")],
    ),
  ),
};
