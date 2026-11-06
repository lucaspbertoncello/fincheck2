// Escapes `%`, `_` and the escape character itself, so a text typed in the search matches as is in a
// `like ... escape '\'`.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
