import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No image optimisation service needed: the only images are user-captured
  // data URLs that never leave the device except as an API payload.
  images: { unoptimized: true },
};

export default nextConfig;
