import "server-only";
import { Brand } from "@/domain/documents/brand";
import type { BrandRepository } from "@/domain/documents/brand-repository";
import { patchSettings, readSettings } from "./settings-file";

/**
 * The instance's visual identity in `settings.json`.
 *
 * It sits beside the other scopes rather than in the document store for the
 * same reason the connection does: it has to be readable before a document is,
 * and it must survive a change of driver. It holds no credential, so there is
 * nothing here to encrypt.
 */
export class FileBrandRepository implements BrandRepository {
  async load(): Promise<Brand> {
    return Brand.restore((await readSettings()).brand);
  }

  async save(brand: Brand): Promise<void> {
    await patchSettings({ brand: brand.toRecord() });
  }
}
