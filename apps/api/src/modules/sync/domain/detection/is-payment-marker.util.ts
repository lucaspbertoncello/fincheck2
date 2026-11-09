import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// The description of a credit on a card that says the invoice was paid: "PAGAMENTO", "PGTO", "PAGTO" or
// "PAG FATURA" (`domain model.md` 4.10). It reads whole words ("PGTO" is not inside "PGTOS").
export function isPaymentMarker(description: string): boolean {
  const text = ` ${normalizeText(description)} `;

  return [' PAGAMENTO ', ' PGTO ', ' PAGTO ', ' PAG FATURA '].some((marker) =>
    text.includes(marker),
  );
}
