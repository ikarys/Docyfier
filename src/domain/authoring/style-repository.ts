import type { StyleParameters } from "./style-parameters";

/**
 * Where the instance's writing style is kept — the port, not a backend.
 */
export interface StyleParametersRepository {
  /** The stored parameters, or the defaults when nothing was configured. */
  load(): Promise<StyleParameters>;
  save(style: StyleParameters): Promise<void>;
}
