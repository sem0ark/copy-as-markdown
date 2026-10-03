import { resolve } from "node:path";
import { defineConfig } from "vite";

const entries = {
  background: resolve(import.meta.dirname, "src/background.ts"),
  content: resolve(import.meta.dirname, "src/content.ts"),
  config: resolve(import.meta.dirname, "src/config.ts"),
};

export default defineConfig(({ mode }) => {
  const entryName = mode as keyof typeof entries;

  if (!entries[entryName]) {
    throw new Error(
      `Unknown build target "${mode}". Expected background, content, or config.`,
    );
  }

  return {
    build: {
      outDir: "dist",
      emptyOutDir: entryName === "background",
      rollupOptions: {
        input: {
          [entryName]: entries[entryName],
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]",
        },
      },
      copyPublicDir: true,
    },
    publicDir: "public",
  };
});
