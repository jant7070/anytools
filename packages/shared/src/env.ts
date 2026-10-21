/**
 * Drops unset and blank variables so Zod defaults and `.optional()` apply. Orchestrators such as
 * Coolify or docker compose pass `${VAR:-}` placeholders as empty strings, which would otherwise
 * fail validation (e.g. an empty optional URL).
 */
export function withoutEmptyEnv(
  source: Record<string, string | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") result[key] = value;
  }
  return result;
}
