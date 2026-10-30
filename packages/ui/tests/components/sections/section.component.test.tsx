import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Section } from '#/components/sections/index.ts';

describe('Section', () => {
  it('names the region by its title and renders the action and the content', () => {
    const html = renderToStaticMarkup(
      <Section title="Gasto do mês" action={<a href="/x">Ver todas</a>}>
        <p>conteudo</p>
      </Section>,
    );

    expect(html).toContain('<h2');
    expect(html).toContain('Gasto do mês');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('Ver todas');
    expect(html).toContain('conteudo');
  });

  it('is open with a rule on top by default and drops the rule on request', () => {
    expect(renderToStaticMarkup(<Section title="A">x</Section>)).toContain('border-t');
    expect(
      renderToStaticMarkup(
        <Section title="A" divider={false}>
          x
        </Section>,
      ),
    ).not.toContain('border-t');
  });

  it('becomes the glass box in the glass variant', () => {
    const html = renderToStaticMarkup(
      <Section title="A" variant="glass">
        x
      </Section>,
    );

    expect(html).toContain('glass');
    expect(html).not.toContain('border-t');
  });
});
