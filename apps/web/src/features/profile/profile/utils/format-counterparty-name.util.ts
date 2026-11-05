const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * The name as the bank printed it ("RAFAEL MOURA") written like a name ("Rafael Moura"). A name that
 * already has lowercase letters was written by a person and is left alone.
 */
export function formatCounterpartyName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed !== trimmed.toLocaleUpperCase('pt-BR')) return trimmed;

  return trimmed
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
    )
    .join(' ');
}
