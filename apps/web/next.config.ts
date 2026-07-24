import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export',
  // Prevent Turbopack from bundling native Node.js modules used by the API layer.
  // These modules use native bindings that cannot be compiled by the bundler.
  serverExternalPackages: ['sqlite3', 'bcryptjs', 'jsonwebtoken', '@prisma/client', 'prisma'],

  // Fix Next.js workspace root detection in this monorepo.
  // Without this, Next.js infers the wrong root from the top-level package.json.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
