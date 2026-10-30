import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  EditDateField,
  normalizeTag,
  TransactionEditPanel,
  validateTransactionEdit,
  type TransactionEditValues,
} from '#/components/transactions/index.ts';

const noop = () => {};

const categories = [
  { id: 'food', name: 'Restaurantes', icon: 'food' },
  { id: 'fun', name: 'Lazer', icon: 'fun' },
] as const;

const values: TransactionEditValues = {
  description: 'Padaria Estrela',
  amountCents: 4590,
  date: '2026-10-19',
  categoryId: 'food',
  tags: ['padaria'],
  nature: 'expense',
  counterpartId: null,
};

function render(overrides: Partial<Parameters<typeof TransactionEditPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <TransactionEditPanel
      values={values}
      onChange={noop}
      categories={categories}
      onSave={noop}
      onCancel={noop}
      {...overrides}
    />,
  );
}

describe('TransactionEditPanel', () => {
  it('draws the fields, the actions and the current values', () => {
    const html = render();

    expect(html).toContain('Descrição');
    expect(html).toContain('Padaria Estrela');
    expect(html).toContain('45,90');
    expect(html).toContain('2026-10-19');
    expect(html).toContain('Restaurantes');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Salvar');
    expect(html).toContain('padaria');
  });

  it('shows each error under its field', () => {
    const html = render({
      errors: { description: 'Escreva uma descrição.', date: 'Escolha uma data válida.' },
    });

    expect(html).toContain('Escreva uma descrição.');
    expect(html).toContain('Escolha uma data válida.');
    expect(html).toContain('aria-invalid="true"');
  });

  it('offers expense, income and transfer, and no "Fora da conta" by default', () => {
    const html = render();

    expect(html).toContain('Despesa');
    expect(html).toContain('Receita');
    expect(html).toContain('Transferência');
    expect(html).not.toContain('Fora da conta');
  });

  it('lets a transaction that is "Fora da conta" go back to expense or income (R6)', () => {
    const html = render({ values: { ...values, nature: 'out_of_account' } });

    expect(html).toContain('Fora da conta');
    expect(html).toContain('Escolha Despesa ou Receita');
  });

  it('asks for the other leg when the nature is transfer (R6)', () => {
    const html = render({
      values: { ...values, nature: 'transfer' },
      counterparts: [{ id: 'leg-1', label: 'Entrada Bradesco, 19 out.' }],
      errors: { counterpart: 'Escolha a outra perna da transferência.' },
    });

    expect(html).toContain('Outra perna da transferência');
    expect(html).toContain('Entrada Bradesco, 19 out.');
    expect(html).toContain('Escolha a outra perna da transferência.');
  });

  it('explains when a transfer has no candidate leg', () => {
    const html = render({ values: { ...values, nature: 'transfer' }, counterparts: [] });

    expect(html).toContain('Nenhuma transação de outra conta combina');
  });

  it('shows the bank original with "Restaurar original" only when there is one', () => {
    expect(render()).not.toContain('Original do banco');

    const html = render({
      original: { description: 'PADARIA ESTRELA 12', amountCents: 5000 },
      onRestoreOriginal: noop,
    });
    expect(html).toContain('Original do banco');
    expect(html).toContain('PADARIA ESTRELA 12');
    expect(html).toContain('Restaurar original');
  });

  it('turns the save button into a loading one', () => {
    expect(render({ saving: true })).toContain('Salvando...');
  });
});

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
