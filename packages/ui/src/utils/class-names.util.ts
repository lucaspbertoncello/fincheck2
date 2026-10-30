type ClassPart = string | false | null | undefined;

/** Joins class names, skipping the falsy ones. */
export function cx(...parts: ClassPart[]): string {
  return parts.filter(Boolean).join(' ');
}
