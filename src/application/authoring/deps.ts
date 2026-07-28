import type {
  BodyPolisher,
  BodyValidator,
  TextGenerator,
} from "@/domain/authoring/text-generator";

/**
 * What an authoring use case needs from the outside world: a model to ask, a
 * validator that knows the editor's schema, and the deterministic formatting
 * pass. A test hands it three objects and drives every surface without a
 * network, a provider or a DOM.
 */
export interface AuthoringDeps {
  generator: TextGenerator;
  validator: BodyValidator;
  polisher: BodyPolisher;
}
