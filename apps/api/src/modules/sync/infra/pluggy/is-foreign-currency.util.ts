// Whether an amount the Pluggy sent is in a currency other than reais: a currency code that is there
// and is not BRL. No code means reais (the Pluggy always says it, so this only protects a body that
// does not). An amount in another currency is never read as reais: no exchange rate is invented.
export function isForeignCurrency(currencyCode: unknown): boolean {
  if (typeof currencyCode !== 'string') return false;
  const code = currencyCode.trim().toUpperCase();

  return code !== '' && code !== 'BRL';
}
