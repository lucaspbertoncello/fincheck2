export interface CreditCardsTable {
  account_id: string;
  brand: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
  last4: string | null;
  closing_day: number;
  due_day: number;
  limit_cents: number | null;
  theme_id: string | null;
}
