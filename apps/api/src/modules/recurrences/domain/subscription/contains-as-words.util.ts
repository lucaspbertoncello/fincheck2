// Whether `pattern` appears in `text` as a whole word (or words): not glued to a letter or a digit
// on either side. Both come already normalized (capitals, no accent). A subscription named "Max"
// is then not found in "MAXXY ACADEMIA", but it is in "MAX *STREAMING" and in "HBO MAX".
export function containsAsWords(text: string, pattern: string): boolean {
  if (pattern === '') return false;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?<![A-Z0-9])${escaped}(?![A-Z0-9])`).test(text);
}
