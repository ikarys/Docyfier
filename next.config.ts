import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // The header shows the running version (see src/components/BrandMark.tsx);
  // inlining it here keeps the single source of truth in package.json.
  env: { NEXT_PUBLIC_APP_VERSION: version },
  // Standalone output: self-contained server bundle for the Docker image
  // (see Dockerfile) — no node_modules copy needed at runtime.
  output: "standalone",
  // Database drivers are loaded at runtime by the storage backend (see
  // src/lib/store/): keep them out of the bundle so their optional/native
  // requires resolve from node_modules instead of breaking the build.
  serverExternalPackages: ["pg", "mysql2"],
};

export default nextConfig;
