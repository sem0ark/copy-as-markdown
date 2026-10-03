import { resolve } from "node:path";
import { defineConfig } from "vite";

const entries = {
  background: resolve(__dirname, "src/background.ts"),
  content: resolve(__dirname, "src/content.ts"),
  config: resolve(__dirname, "src/config.ts"),
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
