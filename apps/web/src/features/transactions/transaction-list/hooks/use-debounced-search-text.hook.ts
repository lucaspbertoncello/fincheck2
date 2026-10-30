import { useEffect, useState } from 'react';

const DEBOUNCE_MS = 300;

/**
 * The text of the search box: it answers at once while typing and reaches the URL (and the server)
 * after a short pause. Follows the URL when it changes from outside (a link, back, "limpar filtros").
 */
export function useDebouncedSearchText(urlText: string, commit: (text: string) => void) {
  const [draft, setDraft] = useState<{ text: string; from: string }>({
    text: urlText,
    from: urlText,
  });
  // The URL moved on its own: take its value instead of the draft.
  const text = draft.from === urlText ? draft.text : urlText;

  useEffect(() => {
    if (text === urlText) return;
    const timer = setTimeout(() => commit(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, urlText, commit]);

  return { text, setText: (next: string) => setDraft({ text: next, from: urlText }) };
}
