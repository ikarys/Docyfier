import { badge, bullets, cardGrid, cover, doc, h, p, statRow, table } from "./blocks";
import type { Template } from "./template";

export const statusReportTemplate: Template = {
  id: "status-report",
  label: "Status report",
  description: "Period metrics, highlights, risks and what comes next.",
  preset: "corporate",
  thumb: ["cover", "stats", "chart", "table"],
  content: doc(
    cover(
      "Status report",
      "Where the project stands, what moved and what needs a decision.",
      "Owner · Period · Audience",
    ),
    p("Headline: one sentence a busy reader can stop at."),
    statRow(
      "grid",
      { value: "82%", label: "Scope delivered", delta: "+12 pts", accent: "green", trend: "good" },
      { value: "4", label: "Open risks", delta: "+1", accent: "yellow", trend: "bad" },
      {
        value: "1.4 s",
        label: "Median response time",
        delta: "−0.3 s",
        accent: "blue",
        trend: "good",
      },
    ),
    h(2, "Progress"),
    {
      type: "chart",
      attrs: {
        kind: "bar",
        categories: ["Week 1", "Week 2", "Week 3", "Week 4"],
        series: [{ label: "Items completed", values: [4, 7, 6, 11] }],
        title: "Delivery per week",
        caption: "Replace with your own figures.",
        showGrid: true,
        showLegend: true,
      },
    },
    h(2, "Highlights"),
    cardGrid(
      {
        title: "Shipped",
        body: "What reached users this period, and the effect it had.",
        accent: "green",
        icon: "check",
      },
      {
        title: "In flight",
        body: "What is being built right now, and when it lands.",
        accent: "blue",
        icon: "rocket",
      },
    ),
    h(2, "Risks"),
    table(
      ["Risk", "Impact", "Owner", "Status"],
      [
        "Dependency not yet confirmed",
        "Delays the release by two weeks",
        "Name",
        badge("At risk", "yellow"),
      ],
      ["Capacity below plan", "Scope has to shrink", "Name", badge("Blocked", "red")],
    ),
    h(2, "Next period"),
    bullets("The one outcome to reach next", "The decision needed from the steering group"),
  ),
};
