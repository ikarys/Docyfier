import { emailComposer } from "./composers/email";
import { ticketComposer } from "./composers/ticket";
import { toComposerInfo, type Composer, type ComposerInfo } from "./types";

/**
 * The composers this build ships. The one place that knows the full list: the
 * menu, the composer page and the server action all read it from here, so a new
 * flow is one import away from being offered everywhere.
 */
export const COMPOSERS: Composer[] = [emailComposer, ticketComposer];

export function findComposer(id: string): Composer | undefined {
  return COMPOSERS.find((composer) => composer.id === id);
}

/** The registry as plain data, safe to hand to a client component. */
export function composerInfos(): ComposerInfo[] {
  return COMPOSERS.map(toComposerInfo);
}
