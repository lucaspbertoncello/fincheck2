// "GOOGLE *YOUTUBEMUSIC" becomes "Google Youtubemusic": the name a suggestion proposes (80 at most).
// It is made from the text of the key (already without the installment "n/N"), with the "*" a card
// puts between the seller and the product taken out.
export function buildSubscriptionName(text: string): string {
  return text
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
    .slice(0, 80);
}
