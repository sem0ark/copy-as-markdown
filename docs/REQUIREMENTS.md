**Vision:** To provide a precision tool for knowledge workers that transforms cluttered web pages into clean, structured Markdown, specifically optimized for Obsidian.

**Goals:**
- **High Fidelity LaTeX:** Native extraction of math formulas into `${...}$` and `$${...}$$` syntax.
- **Structural Precision:** Use an AdBlock-style picker to define exactly what to include or ignore, stored in a site-specific tree structure.
- **Zero-Friction Workflow:** One-click "Copy to Clipboard" functionality for configured sites.

### User UX Flow

**Scenario A: Exporting a Web Page (The "Happy Path")**
1. **Trigger:** User clicks the extension icon in the Chrome toolbar.
2. **Processing:** The extension looks up the `SiteProfile` for the current URL. It executes the recursive tree-based parser (Scoping → Pruning → Turndown).
3. **Completion:** The Markdown string is copied to the clipboard.
4. **Feedback:** A small, non-intrusive "Toast" notification appears at the top-right of the webpage saying "Markdown Copied!".

**Scenario B: Configuring a New Website**
1. **Trigger:** User right-clicks on the page and selects "Configure Export" from the context menu.
2. **Selection:** The "Picker UI" activates. As the user moves the mouse, elements are highlighted.
3. **Action:** User clicks the main content area (e.g., the article body).
4. **Menu:** A floating menu appears: **[Set as Main Frame]**, **[Ignore Region]**.
5. **Save:** User selects **[Set as Main Frame]**. The extension generates a CSS selector and saves it as the root of the tree for that domain.
