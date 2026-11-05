import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Banner, InlineNotice, ToastProvider } from '#/components/feedback/index.ts';

describe('Banner', () => {
  it('renders an error banner as an alert with the reason and the action', () => {
    const html = renderToStaticMarkup(
      <Banner
        variant="error"
        title="Não deu para sincronizar o Bradesco"
        description="Tentamos às 08:00 e 09:00."
        actionLabel="Tentar agora"
        onAction={() => {}}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Não deu para sincronizar o Bradesco');
    expect(html).toContain('Tentamos às 08:00 e 09:00.');
    expect(html).toContain('Tentar agora');
    expect(html).toContain('bg-loss-weak');
  });

  it('renders warning and suggestion as a status, with their own tones', () => {
    const warning = renderToStaticMarkup(<Banner variant="warning" title="Dado de ontem" />);
    const suggestion = renderToStaticMarkup(<Banner variant="suggestion" title="Criar regra?" />);

    expect(warning).toContain('role="status"');
    expect(warning).toContain('bg-caution-weak');
    expect(suggestion).toContain('bg-brand-weak');
  });

  it('puts two answers in a strip under the text, aligned with it, when asked to', () => {
    const html = renderToStaticMarkup(
      <Banner
        variant="suggestion"
        title="Parece uma assinatura: Netflix"
        actionsPlacement="below"
        actionLabel="Acompanhar"
        onAction={() => {}}
        secondaryActionLabel="Agora não"
        onSecondaryAction={() => {}}
      />,
    );

    // Inside the text column (after the title), not at the right edge, and never stretched.
    expect(html.indexOf('Parece uma assinatura')).toBeLessThan(html.indexOf('Acompanhar'));
    expect(html.indexOf('Acompanhar')).toBeLessThan(html.indexOf('Agora não'));
    expect(html).toContain('mt-s12 flex flex-wrap');
    expect(html).not.toContain('w-full');
  });

  it('keeps the buttons at the end, full width on the phone, by default', () => {
    const html = renderToStaticMarkup(
      <Banner variant="warning" title="Dado" actionLabel="Ver" onAction={() => {}} />,
    );

    expect(html).toContain('w-full lg:w-auto');
  });

  it('omits the button when there is no action', () => {
    const html = renderToStaticMarkup(<Banner variant="warning" title="Dado de ontem" />);

    expect(html).not.toContain('<button');
  });
});

describe('InlineNotice', () => {
  it('renders the line with the dot and the link', () => {
    const html = renderToStaticMarkup(
      <InlineNotice linkLabel="ver" onPress={() => {}}>
        Maxxy atrasado 2 dias
      </InlineNotice>,
    );

    expect(html).toContain('Maxxy atrasado 2 dias');
    expect(html).toContain('>ver<');
    expect(html).toContain('underline');
    expect(html).toContain('text-caution');
  });

  it('renders only the text without a link label', () => {
    const html = renderToStaticMarkup(<InlineNotice>Maxxy atrasado 2 dias</InlineNotice>);

    expect(html).not.toContain('underline');
  });
});

describe('ToastProvider', () => {
  it('renders its children and no region while there are no toasts', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <p>Conteúdo</p>
      </ToastProvider>,
    );

    expect(html).toBe('<p>Conteúdo</p>');
  });
});
