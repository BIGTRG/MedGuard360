/**
 * Minimal Handlebars-style template renderer.
 *
 * Replaces {{variable}} tokens in a template string with values from a context map.
 * Unknown tokens are left as-is so missing data is visible in the rendered output
 * rather than silently dropped.
 */

/**
 * Replace every {{variableName}} occurrence in `template` with the
 * corresponding value from `context`. Keys that are absent in `context`
 * are left as `{{variableName}}` so they are clearly visible in the output.
 */
export function renderTemplate(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(context, key)
      ? context[key]
      : `{{${key}}}`;
  });
}
