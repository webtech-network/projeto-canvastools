import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This tool lives inside a larger monorepo-like folder with its own
  // package-lock.json at the repo root; pin the workspace root explicitly so
  // Next.js doesn't have to guess which lockfile scopes this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
