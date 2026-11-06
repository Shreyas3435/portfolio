import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 90 keeps UI text in the 4K product captures sharp; 75 is the default for everything else.
    qualities: [75, 90],
  },
  async redirects() {
    return [{ source: "/classic", destination: "/", permanent: true }];
  },
};

export default nextConfig;
