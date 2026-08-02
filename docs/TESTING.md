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
