/**
 * Test stub for the `server-only` package.
 *
 * The real module throws on import outside a React Server Component graph, so
 * every server module that guards itself with it would be untestable. Tests run
 * in plain Node, where that guard has nothing to protect: aliased to this no-op
 * in `vitest.config.ts`.
 */
export {};
