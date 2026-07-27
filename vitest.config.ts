import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Test setup. Tests are colocated with the code they pin (`*.test.ts`), run in
 * plain Node, and touch no network, no clock and no real database: everything
 * under test here is a pure function or a module whose I/O is redirected at the
 * boundary.
 */
export default defineConfig({
  resolve: {
    // `@/*` comes from tsconfig.json — one source of truth for both compilers.
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      // The domain, its use cases, its adapters and the library modules. Routes
      // and React components come under coverage once their logic is extracted
      // into modules a test can drive without a DOM.
      include: [
        "src/domain/**",
        "src/application/**",
        "src/infrastructure/**",
        "src/lib/**",
      ],
      exclude: ["src/**/*.test.ts"],
      /**
       * A ratchet, not the target. AGENTS.md sets the destination at 80%
       * overall and 95% on the domain; these numbers only ever move up, and a
       * change that lowers them is a change that skipped its tests.
       */
      thresholds: {
        lines: 52,
        functions: 56,
        branches: 44,
        statements: 52,
        // The destination for the whole codebase, already reached where the
        // rules actually live. Every layer joins it as it moves in.
        "src/domain/**": {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
        "src/application/**": {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
    },
  },
});
