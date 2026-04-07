import type { NextConfig } from "next";

// Use environment variable for backend URL so it works both locally and on Vercel
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Rewrites removed so that frontend hits internal Next.js Proxy

};

export default nextConfig;
