import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep server-only packages out of the webpack bundle (better-auth pulls in
  // kysely, which webpack can't statically analyze cleanly).
  serverExternalPackages: ["@usenaive-sdk/node", "better-auth", "@libsql/client", "kysely"],
};

export default nextConfig;
