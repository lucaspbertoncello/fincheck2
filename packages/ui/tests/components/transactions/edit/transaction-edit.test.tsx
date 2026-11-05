import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  EditDateField,
  normalizeTag,
  validateTransactionEdit,
  type TransactionEditValues,
} from '#/components/transactions/index.ts';

const noop = () => {};

const values: TransactionEditValues = {
  description: 'Padaria Estrela',
  amountCents: 4590,
  date: '2026-10-19',
  categoryId: 'food',
  tags: ['padaria'],
  nature: 'expense',
  counterpartId: null,
};

describe('validateTransactionEdit', () => {
  it('accepts a complete transaction', () => {
    expect(validateTransactionEdit(values)).toEqual({});
  });

  it('flags an empty description, a zero amount and a bad date', () => {
    const errors = validateTransactionEdit({
      ...values,
      description: '   ',
      amountCents: 0,
      date: '2026-02-31',
    });

    expect(errors.description).toBeDefined();
    expect(errors.amount).toBeDefined();
    expect(errors.date).toBeDefined();
  });

  it('flags a transfer with no other leg', () => {
    expect(validateTransactionEdit({ ...values, nature: 'transfer' }).counterpart).toBeDefined();
    expect(
      validateTransactionEdit({ ...values, nature: 'transfer', counterpartId: 'leg-1' }),
    ).toEqual({});
  });
});

describe('normalizeTag', () => {
  it('drops the "#", lowercases and joins words with hyphens', () => {
    expect(normalizeTag('  # Café  da Manhã ')).toBe('café-da-manhã');
    expect(normalizeTag('##delivery')).toBe('delivery');
  });

  it('gives an empty text when nothing is left', () => {
    expect(normalizeTag('   ')).toBe('');
    expect(normalizeTag('#')).toBe('');
  });

  it('caps the length', () => {
    expect(normalizeTag('a'.repeat(40))).toHaveLength(24);
  });
});

describe('EditDateField', () => {
  it('writes the date as dd/mm/aaaa in pt-BR', () => {
    const html = renderToStaticMarkup(
      <EditDateField label="Data" value="2026-10-19" onChange={noop} />,
    );
    expect(html).toContain('Data');
    expect(html).toContain('19');
    expect(html).toContain('10');
    expect(html).toContain('2026');
    expect(html.indexOf('19')).toBeLessThan(html.indexOf('2026'));
  });

  it('shows an empty field for an invalid date and the error text', () => {
    const html = renderToStaticMarkup(
      <EditDateField
        label="Data"
        value="2026-02-31"
        onChange={noop}
        error="Escolha uma data válida."
      />,
    );
    expect(html).not.toContain('2026');
    expect(html).toContain('Escolha uma data válida.');
  });
});
