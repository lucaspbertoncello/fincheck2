import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  Checkbox,
  FineNote,
  formatCentsInput,
  MoneyField,
  OkLine,
  parseCentsInput,
  SearchField,
  SegmentedControl,
  Switch,
  TextField,
} from '#/components/forms/index.ts';

const noop = () => {};

describe('cents input', () => {
  it('reads only the digits as cents', () => {
    expect(parseCentsInput('1')).toBe(1);
    expect(parseCentsInput('1.234,56')).toBe(123456);
    expect(parseCentsInput('R$ 12,5')).toBe(125);
    expect(parseCentsInput('')).toBe(0);
    expect(parseCentsInput('abc')).toBe(0);
  });

  it('caps the amount at 12 digits', () => {
    expect(parseCentsInput('1234567890123456')).toBe(123456789012);
  });

  it('shows cents in pt-BR and nothing for zero', () => {
    expect(formatCentsInput(1)).toBe('0,01');
    expect(formatCentsInput(123456)).toBe('1.234,56');
    expect(formatCentsInput(0)).toBe('');
  });
});

describe('TextField', () => {
  it('shows a visible label and the value', () => {
    const html = renderToStaticMarkup(
      <TextField label="Descrição" value="Mercado" onChange={noop} autoComplete="off" />,
    );

    expect(html).toContain('Descrição');
    expect(html).toContain('value="Mercado"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('text-body');
  });

  it('shows the error next to the field and marks it invalid', () => {
    const html = renderToStaticMarkup(
      <TextField label="Nome" value="" onChange={noop} error="Informe o nome" />,
    );

    expect(html).toContain('Informe o nome');
    expect(html).toContain('data-invalid="true"');
  });

  it('writes the helper text and the input mode', () => {
    const html = renderToStaticMarkup(
      <TextField
        label="Parcelas"
        value=""
        onChange={noop}
        description="De 1 a 48"
        inputMode="numeric"
      />,
    );

    expect(html).toContain('De 1 a 48');
    expect(html).toContain('inputMode="numeric"');
  });
});

describe('MoneyField', () => {
  it('shows the typed cents in pt-BR with the numeric keypad', () => {
    const html = renderToStaticMarkup(<MoneyField label="Valor" cents={123456} onChange={noop} />);

    expect(html).toContain('value="1.234,56"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('R$');
  });

  it('shows the placeholder for zero', () => {
    const html = renderToStaticMarkup(<MoneyField label="Valor" cents={0} onChange={noop} />);

    expect(html).toContain('value=""');
    expect(html).toContain('placeholder="0,00"');
  });

  it('has the large variant with the accent line', () => {
    const html = renderToStaticMarkup(
      <MoneyField label="Valor" cents={4250} onChange={noop} size="large" />,
    );

    expect(html).toContain('border-b-2');
    expect(html).toContain('text-hero-mobile');
  });

  it('shows the error under the field', () => {
    const html = renderToStaticMarkup(
      <MoneyField label="Valor" cents={0} onChange={noop} error="Informe um valor" />,
    );

    expect(html).toContain('Informe um valor');
  });
});

describe('SearchField', () => {
  it('has an accessible name, the clear button and the empty state', () => {
    const html = renderToStaticMarkup(
      <SearchField label="Buscar transações" value="" onChange={noop} />,
    );

    expect(html).toContain('aria-label="Buscar transações"');
    expect(html).toContain('aria-label="Limpar busca"');
    expect(html).toContain('data-empty="true"');
    expect(html).toContain('h-ctl-touch');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { key: 'all', label: 'Todas' },
    { key: 'expense', label: 'Despesas' },
    { key: 'income', label: 'Receitas' },
  ];

  it('is a named group with the chosen option selected', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl options={options} value="expense" onChange={noop} label="Tipo" />,
    );

    expect(html).toContain('aria-label="Tipo"');
    expect(html).toContain('Todas');
    expect(html).toContain('Receitas');
    expect(html.match(/data-selected="true"/g)).toHaveLength(1);
  });
});

describe('Switch', () => {
  it('reflects the state and the label', () => {
    const on = renderToStaticMarkup(<Switch isSelected onChange={noop} label="Ativa" />);
    const off = renderToStaticMarkup(
      <Switch isSelected={false} onChange={noop} ariaLabel="Regra" />,
    );

    expect(on).toContain('Ativa');
    expect(on).toContain('data-selected="true"');
    expect(off).toContain('aria-label="Regra"');
    expect(off).not.toContain('data-selected');
  });
});

describe('Checkbox', () => {
  it('reflects the state and the label', () => {
    const html = renderToStaticMarkup(
      <Checkbox isSelected onChange={noop}>
        Aplicar no histórico
      </Checkbox>,
    );

    expect(html).toContain('Aplicar no histórico');
    expect(html).toContain('data-selected="true"');
  });

  it('can be named without visible text', () => {
    const html = renderToStaticMarkup(
      <Checkbox isSelected={false} onChange={noop} ariaLabel="Selecionar Mercado" />,
    );

    expect(html).toContain('aria-label="Selecionar Mercado"');
  });
});

describe('OkLine and FineNote', () => {
  it('writes the text with its icon', () => {
    expect(renderToStaticMarkup(<OkLine>Soma confere</OkLine>)).toContain('Soma confere');
    const note = renderToStaticMarkup(
      <FineNote icon="clock">Próxima sincronização às 18h</FineNote>,
    );

    expect(note).toContain('Próxima sincronização às 18h');
    expect(note).toContain('<svg');
  });
});
