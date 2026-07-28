import { Brand } from "@/domain/documents/brand";
import type { BrandRepository } from "@/domain/documents/brand-repository";

/**
 * The brand held in memory — what a test drives, and the proof that the port is
 * a real abstraction rather than a description of the settings file.
 */
export class InMemoryBrandRepository implements BrandRepository {
  constructor(private brand: Brand = Brand.empty()) {}

  async load(): Promise<Brand> {
    return this.brand;
  }

  async save(brand: Brand): Promise<void> {
    this.brand = brand;
  }
}
