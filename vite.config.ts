import { defineConfig, Plugin } from "vite";
// @ts-ignore
import { resolve } from "path";
// @ts-ignore
import { readFileSync } from "fs";
import react from "@vitejs/plugin-react";

declare var __dirname: string;

// GitHub Pages serves the site from /<repository name>/, not from the domain root
const PAGES_BASE = "/owlbear-rodeo-extension-vtm-v20-dice-character-sheet-ru/";

/**
 * Owlbear Rodeo reads paths in manifest.json as-is, so they need the base path baked in.
 * The source manifest uses a `%BASE%` placeholder that is replaced here.
 */
function manifest(): Plugin {
  let base = "/";
  const render = () =>
    readFileSync(resolve(__dirname, "manifest.template.json"), "utf-8").replace(
      /%BASE%/g,
      base
    );
  return {
    name: "obr-manifest",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.split("?")[0] === `${base}manifest.json`) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(render());
        } else {
          next();
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: render(),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? PAGES_BASE : "/",
  plugins: [react(), manifest()],
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  server: {
    cors: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popover: resolve(__dirname, "popover.html"),
        background: resolve(__dirname, "background.html"),
        editor: resolve(__dirname, "editor.html"),
      },
    },
  },
}));
