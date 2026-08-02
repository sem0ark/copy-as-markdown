/**
 * Template string interpolation for custom Markdown templates
 * Handles {{content}} and future placeholder expansions
 */

export interface TemplateContext {
  content: string;
  [key: string]: string;
}

/**
 * Applies a template string with placeholder substitution
 */
export function applyTemplate(
  template: string,
  context: TemplateContext,
): string {
  let result = template;

  // Replace all placeholders in the format {{key}}
  for (const [key, value] of Object.entries(context)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(placeholder, value);
  }

  return result;
}

/**
 * Validates a template string
 */
export function validateTemplate(template: string): {
  valid: boolean;
  placeholders: string[];
  errors: string[];
} {
  const placeholders: string[] = [];
  const errors: string[] = [];

  // Find all {{...}} patterns
  const regex = /\{\{([^}]*)\}\}/g;
  let match: RegExpExecArray | null = null;

  match = regex.exec(template);
  while (match !== null) {
    const placeholder = match[1].trim();

    if (placeholder.length === 0) {
      errors.push("Empty placeholder found: {{}}");
    }

    if (placeholder.length > 0) {
      placeholders.push(placeholder);
    }

    match = regex.exec(template);
  }

  // Check for unclosed placeholders
  const openCount = (template.match(/\{\{/g) || []).length;
  const closeCount = (template.match(/\}\}/g) || []).length;

  if (openCount !== closeCount) {
    errors.push("Unmatched braces in template");
  }

  return {
    valid: errors.length === 0,
    placeholders: [...new Set(placeholders)],
    errors,
  };
}
