import type { ChoiceOption } from '@fincheck/ui';

/** "Pagamentos por mês": a limit of 1 to 5 Pix, or no limit ("Quantas vierem"). */
export const PAYMENTS_OPTIONS: ChoiceOption[] = [
  { key: 'number', label: 'Até um número' },
  { key: 'any', label: 'Quantas vierem' },
];

/** What the field says under it, by mode. */
export const PAYMENTS_DESCRIPTIONS = {
  number: 'De 1 a 5 Pix por mês. Mais de 1 quando o valor vem dividido.',
  any: 'Soma tudo o que chegar no mês até bater o valor esperado; o que passar aparece como recebido a mais.',
} as const;
