import type { StyleParameters } from "@/domain/authoring/style-parameters";
import type { StyleParametersRepository } from "@/domain/authoring/style-repository";
import type {
  BodyPolisher,
  BodyReader,
  BodyValidator,
  BodyWriter,
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
  /** The format the model reads and answers in — see `BodyReader`. */
  reader: BodyReader;
  writer: BodyWriter;
  validator: BodyValidator;
  polisher: BodyPolisher;
  /** How this instance writes: emoji, bolding, badges, language. */
  style: StyleParameters;
}

/** What configuring the writing style needs: where it is kept, nothing else. */
export interface StyleDeps {
  style: StyleParametersRepository;
}
