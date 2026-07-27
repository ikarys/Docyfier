import { describeProviderRepository } from "@test/contracts/provider-repository";
import { InMemoryProviderRepository } from "./in-memory-provider-repository";

/** The fake runs the same contract as the file adapter — that is what makes it
 * a fake of the port rather than a convenience for tests. */
describeProviderRepository("InMemoryProviderRepository", async () => ({
  repository: new InMemoryProviderRepository(),
}));
