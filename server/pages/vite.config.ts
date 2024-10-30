import { defineConfig, Plugin } from "vite";

import react from "@vitejs/plugin-react";

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { OutputBundle, NormalizedOutputOptions } from "rollup";

import { rename, existsSync, readdirSync, rmdirSync } from "fs";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import svgr from "vite-plugin-svgr";

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default output directory
const defaultDistDir = "dist";

// Load the environment variable for the output directory
const page = process.env.PAGE || "";
const indexDir = page ? `src/pages/${page}` : "";
const indexHtmlPath = page ? `${indexDir}/index.html` : "index.html";

function removeEmptyDirs(dir: string) {
  if (existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir);

    removeEmptyDirs(dirname(dir));
  }
}

const MoveHtmlToRootPlugin = (): Plugin => {
  return {
    name: "move-html-to-root",
    writeBundle(outputOptions: NormalizedOutputOptions, bundle: OutputBundle) {
      for (const file in bundle) {
        if (file === indexHtmlPath) {
          const fileName = bundle[file].fileName;
          const outputDir = outputOptions.dir || "dist";
          const outputSrcDir = resolve(__dirname, `${outputDir}/${indexDir}`);

          rename(
            resolve(__dirname, `${outputDir}/${fileName}`),
            resolve(__dirname, `${outputDir}/index.html`),
            (err) => {
              if (err) {
                console.error(err);
              }
            }
          );

          // Update the bundle to reflect the new file name in the printout
          bundle[file].fileName = "index.html";

          console.log(`Moved ${fileName} to ${outputDir} root for deployment`);

          removeEmptyDirs(outputSrcDir);
          console.log(`Removed empty directories in ${outputSrcDir}`);
        }
      }
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    MoveHtmlToRootPlugin(),
    ViteImageOptimizer(),
    svgr({
      svgrOptions: {
        icon: true, // Replace SVG width and height by a custom value. If value is omitted, it uses 1em in order to make SVG size inherits from text size.
        svgo: true, // This will enable/disable SVGO optimisation when rendering component
        replaceAttrValues: {
          "#fff": "currentColor", // This will replace the fill attribute with currentColor = text color
        },
        memo: true, // This will enable/disable memoization
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, indexHtmlPath),
      },
    },

    outDir: resolve(__dirname, defaultDistDir, page),
    assetsDir: ".",
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ["react-dom", "dot-object", "copy-to-clipboard"],
  },
});
