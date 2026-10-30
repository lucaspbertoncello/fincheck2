import type { InvoiceInstallment } from '@fincheck/ui';

/** Balance at the end of each day of a month, in cents. */
export const BALANCE_CURVE = [
  240000, 236000, 231500, 288000, 280000, 275000, 270500, 262000, 255000, 301000, 296000, 290000,
  284500, 279000, 272000, 268000, 264000, 310000, 305000, 298000, 291000, 287000, 281000, 275500,
  270000, 264000, 259000, 253000, 247500, 242000,
];

export const INSTALLMENTS: InvoiceInstallment[] = [
  { id: 'inst-1', merchant: 'Eletro Pinheiro', partLabel: 'Parcela 3 de 10', cents: 12990 },
  { id: 'inst-2', merchant: 'Casa & Cia', partLabel: 'Parcela 1 de 4', cents: 21000 },
  { id: 'inst-3', merchant: 'Livraria Nogueira', partLabel: 'Parcela 2 de 3', cents: 6450 },
];
