// The brand the bank names, without case or spaces ("MASTERCARD", "American Express").
export function translatePluggyCardBrand(
  brand: unknown,
): 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other' {
  if (typeof brand !== 'string') return 'other';
  const normalized = brand.toLowerCase().replace(/[^a-z]/g, '');

  if (normalized === 'visa') return 'visa';
  if (normalized === 'mastercard') return 'mastercard';
  if (normalized === 'elo') return 'elo';
  if (normalized === 'amex' || normalized === 'americanexpress') return 'amex';
  if (normalized === 'hipercard') return 'hipercard';

  return 'other';
}
