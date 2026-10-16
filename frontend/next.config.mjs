/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo root has its own package-lock.json; pin the workspace to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
