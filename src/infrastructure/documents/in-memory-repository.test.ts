import { describeDocumentRepository } from "@test/contracts/document-repository";
import { InMemoryDocumentRepository } from "./in-memory-repository";

describeDocumentRepository("InMemoryDocumentRepository", async () => ({
  repository: new InMemoryDocumentRepository(),
}));
