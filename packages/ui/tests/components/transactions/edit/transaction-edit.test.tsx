import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EditDateField, normalizeTag } from '#/components/transactions/index.ts';

const noop = () => {};

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
