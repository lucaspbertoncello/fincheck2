import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from '#/components/buttons/index.ts';

describe('Button', () => {
  it('renders the label as a button that does not submit by default', () => {
    const html = renderToStaticMarkup(<Button>Salvar</Button>);

    expect(html).toContain('Salvar');
    expect(html).toContain('type="button"');
    expect(html).toContain('--gradient-button');
  });

  it('uses the danger gradient for a primary danger button', () => {
    const html = renderToStaticMarkup(<Button danger>Excluir</Button>);

    expect(html).toContain('--gradient-danger');
  });

  it('gives secondary and tertiary their own look', () => {
    const secondary = renderToStaticMarkup(<Button variant="secondary">Pular</Button>);
    const tertiary = renderToStaticMarkup(
      <Button variant="tertiary" danger>
        Excluir
      </Button>,
    );

    expect(secondary).toContain('border-line');
    expect(secondary).not.toContain('--gradient-button');
    expect(tertiary).toContain('text-loss');
  });

  it('names an icon-only button for screen readers and hides the icon', () => {
    const html = renderToStaticMarkup(<Button iconOnly icon="close" label="Fechar" />);

    expect(html).toContain('aria-label="Fechar"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('size-ctl-touch');
  });

  it('keeps the small button 36 px with a bigger touch area', () => {
    const html = renderToStaticMarkup(<Button size="sm">Revisar</Button>);

    expect(html).toContain('h-ctl-sm');
    expect(html).toContain('before:-inset-y-s4');
  });

  it('shows the loading label with a spinning icon and blocks presses', () => {
    const html = renderToStaticMarkup(
      <Button loading loadingLabel="Sincronizando..." variant="secondary">
        Sincronizar
      </Button>,
    );

    expect(html).toContain('Sincronizando...');
    expect(html).not.toContain('>Sincronizar<');
    expect(html).toContain('animate-spin');
    expect(html).toContain('aria-disabled="true"');
  });

  it('marks a disabled button and fills the width on request', () => {
    const html = renderToStaticMarkup(
      <Button isDisabled fullWidth>
        Salvar
      </Button>,
    );

    expect(html).toContain('disabled');
    expect(html).toContain('w-full');
  });
});
