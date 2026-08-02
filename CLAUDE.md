Application vision, component architecture, etc. are defined in `@docs/`. In case of any explicit changes to logic or data structures, adjust the documentation in `@docs/` immediately.

**Avoid documenting all your actions after completing a task in separate report files.** All high-level or approach-level changes should be documented in appropriate files in `@docs/` only. Do not generate "Summary of changes" or "Task completed" reports as separate files or add them into `@docs` to prevent context pollution and future hallucinations.

Development Standards:
- **Language:** TypeScript (Strict mode).
- **Package Manager:** `pnpm` CLI only.
- **Build Tool:** `vite` with a configuration that outputs clean `background.js` and `content.js` files for Manifest V3.
- **Code Quality:** Use `biome` for type checking, linting, and autoformatting. Run checks before committing.
- **Testing:** Implement AAA-approach unit tests for the **Export Layer** using `vitest` and `jsdom`. Core transformation logic must be verified without a browser instance.
- **Installation:** The extension is loaded locally via "Load unpacked" from the `dist/` folder.

Main commands to use:
- Use `pnpm build` to compile the extension.
- Use `pnpm dev` (vite build --watch) during active development.
- Use `pnpm test` to run the logic validation suite.
- Use `pnpm check` to run Biome's type checking, linting, and autoformatting.
- Use `pnpm format` for autoformatting only.
- Use `pnpm lint` for linting only.

**If a task is complete, update the code and the documentation. Do not explain what you did in a new file.** If you encounter ambiguity in the requirements or multiple ways of implementation, ask for clarification rather than assuming a new architectural direction.
