import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.PUBLIC_BASE || (process.env.GITHUB_PAGES === "true" ? "/meizhaung-pages/" : "./"),
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["meizhaung-shaobo-0620.loca.lt", ".loca.lt", ".lhr.life", ".localhost.run"]
  }
});
