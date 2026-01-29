import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Capacitor compatibility
  output: "export",
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Add trailing slashes for static file compatibility
  trailingSlash: true,
};

export default nextConfig;
