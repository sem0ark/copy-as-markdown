# Unit Tests (Vitest)

**Target:** Pure functions in `engine/`, `extension/`, and `shared/`

**Requirement:** All tests MUST follow the **AAA (Arrange-Act-Assert)** approach.

## Test Structure

```typescript
// shared/tree-utils.test.ts
test('should find a deeply nested node', () => {
  // Arrange - Set up test data
  const tree = {
    id: 'root',
    selector: 'body',
    action: 'include',
    children: [
      {
        id: 'main',
        selector: 'main',
        action: 'include',
        children: [
          { id: 'article', selector: 'article', action: 'include', children: [] }
        ]
      }
    ]
  };

  // Act - Execute the function being tested
  const result = findNodeById(tree, 'article');

  // Assert - Verify the result
  expect(result).toBeDefined();
  expect(result?.id).toBe('article');
});
```

## Regression Tests

Regression cases live in `src/engine/regression-tests/cases/` as JSON files. Each case
contains the captured `rawHtml`, an `ExportNode`-shaped `config`, and
`expectedFragments` that must appear in the processed Markdown.

Run the suite with:

```bash
pnpm test:regression
```

New cases are discovered automatically when a `.json` file is added to the cases
directory. Copy the full HTML from a `[Markdown Export Case]` log, then add an ID,
description, and the output fragments that describe the expected behavior.

## Required Test Coverage

### Data Structure Utilities (shared/)
- Tree traversal (root, children, deep nesting)
- Node lookup by ID
- ID uniqueness validation
- JSON serialization/deserialization
- Schema validation (domain, selectors, actions, templates)

### Formatting (engine/formatter.ts)
```typescript
// engine/formatter.test.ts
test('replaces {{content}} placeholder', () => {
  const result = applyTemplate('> {{content}}', { content: 'Hello' });
  expect(result).toBe('> Hello');
});
```

# Integration Tests

**Target:** Full export pipeline with JSDOM

```typescript
// engine/processor.test.ts
test('exports article with ignored sidebar', () => {
  const html = `<article><h1>Title</h1><aside>Ad</aside></article>`;
  const profile = {
    root: { 
      selector: 'article', 
      action: 'include',
      children: [
        { selector: 'aside', action: 'ignore', children: [] }
      ]
    }
  };
  const result = processPage(profile);
  expect(result).not.toContain('Ad');
});
```
