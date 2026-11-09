// The charge description as the service patterns read it: capitals, no accents, "+" as "PLUS", every
// other mark a space ("OPENAI *CHATGPT SUBSCR" -> "OPENAI CHATGPT SUBSCR", "NETFLIX.COM" -> "NETFLIX COM").
export function normalizeServiceText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\+/g, ' PLUS ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}
