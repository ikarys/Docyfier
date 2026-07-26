import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: self-contained server bundle for the Docker image
  // (see Dockerfile) — no node_modules copy needed at runtime.
  output: "standalone",
  // Database drivers are loaded at runtime by the storage backend (see
  // src/lib/store/): keep them out of the bundle so their optional/native
  // requires resolve from node_modules instead of breaking the build.
  serverExternalPackages: ["pg", "mysql2"],
};

export default nextConfig;
