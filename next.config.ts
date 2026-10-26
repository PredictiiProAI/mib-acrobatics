import type { NextConfig } from "next";

const STORAGE_PATH = "/storage/v1/object/public/**";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: STORAGE_PATH },
      ...(supabaseUrl
        ? [{ protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https", hostname: supabaseUrl.hostname, port: supabaseUrl.port, pathname: STORAGE_PATH }]
        : []),
    ],
    // Local Supabase (127.0.0.1) is a private IP, which the optimizer refuses by default.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
