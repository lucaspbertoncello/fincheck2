import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConnectionErrorNotice, EmptyState, SyncErrorBanner } from '#/components/states/index.ts';

describe('EmptyState', () => {
  it('renders icon, title, sentence and both actions', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon="inbox"
        title="Nenhuma transação em outubro ainda"
        description="Conecte uma conta ou lance a primeira."
        primaryAction={{ label: 'Conectar contas', onPress: () => {} }}
        secondaryAction={{ label: 'Lançar transação', onPress: () => {} }}
      />,
    );

    expect(html).toContain('<h2');
    expect(html).toContain('Nenhuma transação em outubro ainda');
    expect(html).toContain('Conecte uma conta ou lance a primeira.');
    expect(html).toContain('Conectar contas');
    expect(html).toContain('Lançar transação');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders without actions and with the chosen heading level', () => {
    const html = renderToStaticMarkup(
      <EmptyState icon="check" title="Tudo revisado" headingLevel={3} />,
    );

    expect(html).toContain('<h3');
    expect(html).not.toContain('<button');
  });
});

describe('SyncErrorBanner', () => {
  it('names the bank and offers "Tentar agora"', () => {
    const html = renderToStaticMarkup(
      <SyncErrorBanner institution="Bradesco" detail="Última tentativa 09:00" onRetry={() => {}} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Não deu para sincronizar o Bradesco');
    expect(html).toContain('Última tentativa 09:00');
    expect(html).toContain('Tentar agora');
  });
});

describe('ConnectionErrorNotice', () => {
  it('points to Meu Pluggy in a new tab', () => {
    const html = renderToStaticMarkup(
      <ConnectionErrorNotice reason="login com erro" href="https://meu.example/pluggy" />,
    );

    expect(html).toContain('Conexão com erro, login com erro');
    expect(html).toContain('Reconectar no Meu Pluggy');
    expect(html).toContain('href="https://meu.example/pluggy"');
    expect(html).toContain('target="_blank"');
  });
});
