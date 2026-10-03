import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { releaseMetadata } from "./scripts/release-metadata";

export default defineConfig({
  plugins: [react(), releaseMetadata()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
