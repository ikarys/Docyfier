import { decisionNoteTemplate } from "@/domain/documents/templates/decision-note";
import { incidentPostmortemTemplate } from "@/domain/documents/templates/incident-postmortem";
import { meetingNotesTemplate } from "@/domain/documents/templates/meeting-notes";
import { projectOnePagerTemplate } from "@/domain/documents/templates/project-one-pager";
import { roadmapTemplate } from "@/domain/documents/templates/roadmap";
import { statusReportTemplate } from "@/domain/documents/templates/status-report";
import { techSpecTemplate } from "@/domain/documents/templates/tech-spec";
import type { Template } from "@/domain/documents/templates/template";

export type { Template, ThumbBlock } from "@/domain/documents/templates/template";

/**
 * The templates this build ships, in the order the gallery offers them. The one
 * place that knows the full list: adding a template is one file under
 * `domain/documents/templates/` and one line here.
 */
export const TEMPLATES: readonly Template[] = [
  meetingNotesTemplate,
  projectOnePagerTemplate,
  techSpecTemplate,
  statusReportTemplate,
  roadmapTemplate,
  incidentPostmortemTemplate,
  decisionNoteTemplate,
];

export function findTemplate(id: unknown): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
