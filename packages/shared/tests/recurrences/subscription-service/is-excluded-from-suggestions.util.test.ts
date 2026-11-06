import { describe, expect, it } from 'vitest';

import { isExcludedFromSuggestions } from '#/recurrences/subscription-service/is-excluded-from-suggestions.util.ts';

describe('isExcludedFromSuggestions', () => {
  it.each([
    'Ifood *restaurante',
    'IFOOD *SUSHI HOUSE',
    'IFD*PASTELARIA',
    'RAPPI BRASIL',
    'Uber Eats',
    'UBER *TRIP',
    '99 TECNOLOGIA',
    '99APP *CORRIDA',
    'Restaurante Sabor da Casa',
    'PIZZARIA NAPOLI',
    'Supermercado Bom Preço',
    'MERCADO DO BAIRRO',
    'Atacadão Centro',
    'POSTO BR RODOVIA',
    'Posto Shell',
    'COMBUSTÍVEL IPIRANGA',
  ])('excludes "%s"', (description) => {
    expect(isExcludedFromSuggestions(description)).toBe(true);
  });

  it.each([
    'NETFLIX.COM',
    'SPOTIFY',
    'APPLE.COM/BILL 9.99',
    'DEEZER PREMIUM',
    'IFOOD CLUBE',
    'UBER ONE',
    'MERCADO PAGO *SPOTIFY',
    'MERCADOLIVRE*MELI+',
    'LEITURA MENSAL CLUBE',
  ])('keeps "%s"', (description) => {
    expect(isExcludedFromSuggestions(description)).toBe(false);
  });
});
