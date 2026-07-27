import "server-only";
import type { DocumentRepository } from "@/domain/documents/repository";
import type { StorageConnectionRecord } from "@/domain/configuration/storage-connection";
import { fileDocumentRepository } from "./fs-repository";

/**
 * Resolves the configured backend to a repository — the one place that knows
 * which adapters exist. SQL adapters own a connection pool, so they are cached:
 * the cache hangs off `globalThis` because Next's dev HMR re-evaluates modules,
 * and a module-level pool would leak on every reload.
 */

type Cached = { key: string; repository: Promise<DocumentRepository> };

const cache = globalThis as typeof globalThis & { __docyfierRepository?: Cached };

function configKey(s: StorageConnectionRecord): string {
  return [s.driver, s.host, s.port, s.user, s.password, s.database, s.ssl].join(" ");
}

async function connect(settings: StorageConnectionRecord): Promise<DocumentRepository> {
  if (settings.driver === "postgres") {
    const { createPostgresRepository } = await import("./postgres-repository");
    return createPostgresRepository(settings);
  }
  const { createMysqlRepository } = await import("./mysql-repository");
  return createMysqlRepository(settings);
}

/** The repository for an explicit config — used by the settings page to
 * validate a connection before saving it. */
export function repositoryFor(settings: StorageConnectionRecord): Promise<DocumentRepository> {
  if (settings.driver === "files") return Promise.resolve(fileDocumentRepository);

  const key = configKey(settings);
  if (cache.__docyfierRepository?.key === key) return cache.__docyfierRepository.repository;

  void closeRepository();
  const repository = connect(settings);
  const entry: Cached = { key, repository };
  cache.__docyfierRepository = entry;
  // A failed connection must not be cached, or a fixed database would still
  // report the original error until the process restarts.
  repository.catch(() => {
    if (cache.__docyfierRepository === entry) cache.__docyfierRepository = undefined;
  });
  return repository;
}

/** The file-backed repository, whatever the settings say — the source the
 * "import my documents into the database" flow reads from. */
export function fileRepository(): DocumentRepository {
  return fileDocumentRepository;
}

/** Connect with an explicit config, count the documents, release. Validates a
 * connection from the settings page without disturbing the live pool. */
export async function probeRepository(settings: StorageConnectionRecord): Promise<number> {
  if (settings.driver === "files") return (await fileDocumentRepository.list()).length;
  const repository = await connect(settings);
  try {
    return (await repository.list()).length;
  } finally {
    await repository.close?.();
  }
}

/** Drop the cached pool, e.g. after the storage settings change. */
export async function closeRepository(): Promise<void> {
  const entry = cache.__docyfierRepository;
  cache.__docyfierRepository = undefined;
  if (!entry) return;
  await entry.repository.then(
    (repository) => repository.close?.(),
    () => {},
  );
}
