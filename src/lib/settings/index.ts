/**
 * App settings, one module per scope: the AI providers, the document store, the
 * export targets. Everything is file-backed and resolved as **settings file >
 * environment > default**, so nothing here needs a rebuild or a restart.
 *
 * This index only re-exports; pages and actions may import a scope directly.
 */
export * from "./ai";
export * from "./brand";
export * from "./exports";
export * from "./storage";
export * from "./style";
