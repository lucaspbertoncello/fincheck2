import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  AmountField,
  CategoryPicker,
  ChoiceField,
  DateQuickField,
  FieldSet,
  SelectField,
} from '#/components/forms/index.ts';
import { formatCentsInput, parseCentsInput } from '#/components/forms/index.ts';
import { splitCategoryGroups } from '#/components/forms/split-category-groups.util.ts';

const noop = () => {};

describe('AmountField', () => {
  it('shows the number big, the R$ smaller and the label as the name of the input', () => {
    const html = renderToStaticMarkup(<AmountField cents={123456} onChange={noop} />);

    expect(html).toContain('value="1.234,56"');
    expect(html).toContain('R$');
    expect(html).toContain('amount-size');
    expect(html).toContain('--amount-fit:1');
    expect(html).toContain('amount-affix');
    expect(html).toContain('money-numeric');
    expect(html).toContain('Valor');
    expect(html).toContain('inputMode="numeric"');
  });

  it('has the placeholder 0,00 when empty', () => {
    const html = renderToStaticMarkup(<AmountField cents={0} onChange={noop} />);

    expect(html).toContain('placeholder="0,00"');
    expect(html).toContain('value=""');
  });

  it('resolves the sign with the Despesa | Receita selector and tints the sign by kind', () => {
    const expense = renderToStaticMarkup(
      <AmountField cents={100} onChange={noop} kind="expense" onKindChange={noop} />,
    );
    const income = renderToStaticMarkup(
      <AmountField cents={100} onChange={noop} kind="income" onKindChange={noop} />,
    );

    expect(expense).toContain('Despesa');
    expect(expense).toContain('Receita');
    expect(expense).toContain('−');
    expect(expense).toContain('text-loss');
    expect(income).toContain('+');
    expect(income).toContain('text-gain');
    expect(income).toContain('translateX(100%)');
    expect(expense).toContain('translateX(0%)');
    expect(income).toContain('data-tone="gain"');
    expect(expense).toContain('data-tone="loss"');
  });

  it('hides the selector when the caller does not handle the kind', () => {
    const html = renderToStaticMarkup(<AmountField cents={100} onChange={noop} />);

    expect(html).not.toContain('Despesa');
  });

  it('marks the error state and shows the message', () => {
    const html = renderToStaticMarkup(
      <AmountField cents={0} onChange={noop} error="Informe um valor maior que zero." />,
    );

    expect(html).toContain('Informe um valor maior que zero.');
    expect(html).toContain('data-invalid="true"');
  });

  it('is disabled as a whole', () => {
    const html = renderToStaticMarkup(
      <AmountField cents={500} onChange={noop} onKindChange={noop} isDisabled />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('data-disabled="true"');
  });

  it('types by shifting the cents and deleting by dropping the last digit', () => {
    const typed = (text: string) => formatCentsInput(parseCentsInput(text));

    expect(typed('1')).toBe('0,01');
    expect(typed('12')).toBe('0,12');
    expect(typed('123')).toBe('1,23');
    expect(typed('1234')).toBe('12,34');
    // Backspace on "12,34" leaves "12,3": the digits 123 are 1,23.
    expect(typed('12,3')).toBe('1,23');
    expect(typed('')).toBe('');
  });
});

describe('FieldSet', () => {
  it('names the group with the visible label and shows the error as an alert', () => {
    const html = renderToStaticMarkup(
      <FieldSet label="Conta" aside="obrigatório" error="Escolha uma conta.">
        <div />
      </FieldSet>,
    );

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('Conta');
    expect(html).toContain('obrigatório');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Escolha uma conta.');
  });
});

describe('ChoiceField', () => {
  const options = [
    { key: 'nubank', label: 'Nubank' },
    { key: 'itau', label: 'Itaú' },
  ];

  it('shows every option as a radio chip', () => {
    const html = renderToStaticMarkup(
      <ChoiceField label="Conta" options={options} value="itau" onChange={noop} />,
    );

    expect(html).toContain('Nubank');
    expect(html).toContain('Itaú');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('type="radio"');
  });

  it('does not change weight or border width when chosen (no layout jump)', () => {
    const html = renderToStaticMarkup(
      <ChoiceField label="Conta" options={options} value="itau" onChange={noop} />,
    );

    expect(html).not.toContain('data-[selected]:font-emphasis');
    expect(html).not.toContain('border-2');
  });

  it('can be a segmented track for two or three short options', () => {
    const html = renderToStaticMarkup(
      <ChoiceField
        label="Frequência"
        variant="segmented"
        options={[
          { key: 'month', label: 'Mensal' },
          { key: 'year', label: 'Anual' },
        ]}
        value="month"
        onChange={noop}
      />,
    );

    expect(html).toContain('Mensal');
    expect(html).toContain('aria-label="Frequência"');
  });

  it('shows the error under the chips', () => {
    const html = renderToStaticMarkup(
      <ChoiceField label="Conta" options={options} value={null} onChange={noop} error="Escolha." />,
    );

    expect(html).toContain('Escolha.');
  });
});

describe('SelectField', () => {
  it('uses the shared field box (one focus ring) and shows the placeholder', () => {
    const html = renderToStaticMarkup(
      <SelectField
        label="Banco"
        options={[{ key: 'a', label: 'Banco A' }]}
        value={null}
        onChange={noop}
        placeholder="Escolher banco"
      />,
    );

    expect(html).toContain('field-ring');
    expect(html).toContain('Escolher banco');
    expect(html).toContain('Banco');
  });
});

describe('CategoryPicker', () => {
  const categories = [
    { id: 'market', name: 'Mercado', icon: 'cart' as const },
    { id: 'food', name: 'Delivery', icon: 'delivery' as const },
  ];

  it('shows the chosen category by name in the field', () => {
    const html = renderToStaticMarkup(
      <CategoryPicker label="Categoria" categories={categories} value="market" onChange={noop} />,
    );

    expect(html).toContain('value="Mercado"');
    expect(html).toContain('field-ring');
    expect(html).toContain('role="combobox"');
  });

  it('shows the search placeholder when nothing is chosen', () => {
    const html = renderToStaticMarkup(
      <CategoryPicker label="Categoria" categories={categories} value={null} onChange={noop} />,
    );

    expect(html).toContain('placeholder="Buscar categoria"');
  });

  it('shows the chosen category of a grouped list as it does of a flat one', () => {
    const grouped = [
      { id: 'market', name: 'Mercado', icon: 'cart' as const, group: 'Abate gasto' },
      { id: 'salary', name: 'Salário', icon: 'cart' as const, group: 'Conta como receita' },
    ];
    const html = renderToStaticMarkup(
      <CategoryPicker
        label="Categoria"
        categories={grouped}
        groupHints={{ 'Abate gasto': 'O crédito reduz o gasto.' }}
        value="salary"
        onChange={noop}
      />,
    );

    expect(html).toContain('value="Salário"');
    expect(html).toContain('role="combobox"');
  });
});

describe('splitCategoryGroups', () => {
  it('puts each group where its first option came, with the order kept inside it', () => {
    const options = [
      { id: 'a', name: 'A', icon: 'cart' as const, group: 'Abate gasto' },
      { id: 'b', name: 'B', icon: 'cart' as const, group: 'Conta como receita' },
      { id: 'c', name: 'C', icon: 'cart' as const, group: 'Abate gasto' },
    ];

    expect(
      splitCategoryGroups(options).map((group) => [group.label, group.options.map((o) => o.id)]),
    ).toEqual([
      ['Abate gasto', ['a', 'c']],
      ['Conta como receita', ['b']],
    ]);
  });

  it('is one group with no label when no option has a group', () => {
    const groups = splitCategoryGroups([{ id: 'a', name: 'A', icon: 'cart' as const }]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBeUndefined();
  });
});

describe('DateQuickField', () => {
  it('offers the shortcuts and the calendar', () => {
    const html = renderToStaticMarkup(
      <DateQuickField label="Data" value="2026-10-30" today="2026-10-30" onChange={noop} />,
    );

    expect(html).toContain('Hoje');
    expect(html).toContain('Ontem');
    expect(html).toContain('Outra data');
  });

  it('shows the chosen date in the third chip when it is neither today nor yesterday', () => {
    const html = renderToStaticMarkup(
      <DateQuickField label="Data" value="2026-10-12" today="2026-10-30" onChange={noop} />,
    );

    expect(html).toContain('12/10/2026');
    expect(html).not.toContain('Outra data');
  });

  it('treats the last day of the previous month as yesterday', () => {
    const html = renderToStaticMarkup(
      <DateQuickField label="Data" value="2026-09-30" today="2026-10-01" onChange={noop} />,
    );

    expect(html).toContain('Outra data');
    expect(html).not.toContain('30/09/2026');
  });
});

describe('AmountField fit', () => {
  it('shrinks the number when the text is longer than 8 characters', () => {
    const long = renderToStaticMarkup(<AmountField cents={12345678} onChange={noop} />);

    // "123.456,78" has 10 characters: 8/10 of the size.
    expect(long).toContain('--amount-fit:0.8');
  });
});

describe('FieldSet description', () => {
  it('links the line to the group with aria-describedby', () => {
    const html = renderToStaticMarkup(
      <FieldSet label="Categoria" description="O crédito reduz o gasto.">
        <span />
      </FieldSet>,
    );
    const id = /aria-describedby="([^"]+)"/.exec(html)?.[1];

    expect(id).toBeDefined();
    expect(html).toContain(`id="${id}"`);
  });

  it('has no aria-describedby without a description', () => {
    const html = renderToStaticMarkup(
      <FieldSet label="Categoria">
        <span />
      </FieldSet>,
    );

    expect(html).not.toContain('aria-describedby');
  });
});
