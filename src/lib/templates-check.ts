import "server-only";
import { validateDocJson } from "@/infrastructure/editor/schema";
import { TEMPLATES } from "@/lib/templates";

/**
 * Templates go through the same schema validation as AI output. The check runs
 * at module scope of the (statically rendered) template gallery, so a template
 * that no longer matches the editor schema — a renamed node, a changed content
 * model — fails `next build` instead of handing a user a broken document.
 */

let validated = false;

export function assertTemplatesValid(): void {
  if (validated) return;
  for (const template of TEMPLATES) {
    try {
      validateDocJson(template.content);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Template "${template.id}" is not a valid document: ${reason}`);
    }
  }
  validated = true;
}
