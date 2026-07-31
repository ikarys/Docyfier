import { sampleChart } from "@/domain/documents/chart";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { heading, para, type RoundTripCase } from "./nodes";

/** The blocks that present content — everything markdown needs a directive for. */
export const LAYOUT_CASES: RoundTripCase[] = [
  {
    name: "callout with a variant and an icon",
    blocks: [
      { type: "callout", attrs: { variant: "warn", icon: "zap" }, content: [para("Attention")] },
    ],
  },
  {
    name: "card grid",
    blocks: [
      {
        type: "cardGrid",
        attrs: { cols: 2 },
        content: [
          {
            type: "card",
            attrs: { accent: "blue", icon: "zap" },
            content: [heading(3, "Rapide"), para("Sous les 5 s")],
          },
          {
            type: "card",
            attrs: { accent: "green" },
            content: [heading(3, "Sûr"), para("Chiffré au repos")],
          },
        ],
      },
    ],
  },
  {
    name: "column list",
    blocks: [
      {
        type: "columnList",
        content: [
          { type: "column", content: [para("Gauche")] },
          { type: "column", content: [para("Droite")] },
        ],
      },
    ],
  },
  {
    name: "stat row, one stat carrying a delta",
    blocks: [
      {
        type: "statRow",
        content: [
          {
            type: "stat",
            attrs: { accent: "green", trend: "good", layout: "row", icon: "zap" },
            content: [para("120ms"), para("Latence p95"), para("−73%")],
          },
          { type: "stat", attrs: { trend: "bad" }, content: [para("4"), para("Incidents")] },
        ],
      },
    ],
  },
  {
    name: "timeline",
    blocks: [
      {
        type: "timeline",
        content: [
          {
            type: "timelineItem",
            attrs: { accent: "purple" },
            content: [para("Q1 2025"), heading(3, "Lancement"), para("Bêta privée")],
          },
          {
            type: "timelineItem",
            content: [para("Q2 2025"), heading(3, "Ouverture"), para("Tout public")],
          },
        ],
      },
    ],
  },
  {
    name: "step list",
    blocks: [
      {
        type: "stepList",
        content: [
          {
            type: "step",
            attrs: { accent: "yellow", icon: "zap" },
            content: [heading(3, "Installer"), para("npm install")],
          },
          { type: "step", content: [heading(3, "Lancer"), para("npm run dev")] },
        ],
      },
    ],
  },
  {
    name: "pyramid",
    blocks: [
      {
        type: "pyramid",
        content: [
          { type: "pyramidTier", content: [para("Vision"), para("Le cap")] },
          { type: "pyramidTier", content: [para("Exécution")] },
        ],
      },
    ],
  },
  {
    name: "chart",
    blocks: [{ type: "chart", attrs: { ...sampleChart("line"), title: "Revenu", caption: "En k€" } }],
  },
  {
    name: "diagram",
    blocks: [{ type: "diagram", attrs: { ...sampleDiagram("architecture"), title: "Le système" } }],
  },
];
