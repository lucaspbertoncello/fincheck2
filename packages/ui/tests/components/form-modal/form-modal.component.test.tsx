import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FormModal,
  FormModalGroup,
  FormModalMore,
  FormModalSplit,
} from '#/components/form-modal/index.ts';

const noop = () => {};

describe('FormModal', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <FormModal
        isOpen={false}
        onOpenChange={noop}
        title="Nova transação"
        submitLabel="Adicionar"
        onSubmit={noop}
      >
        <p>Campos</p>
      </FormModal>,
    );

    expect(html).not.toContain('Nova transação');
  });
});

describe('FormModalGroup', () => {
  it('names the group with a quiet label and a hairline', () => {
    const html = renderToStaticMarkup(
      <FormModalGroup label="Quando e onde">
        <input />
      </FormModalGroup>,
    );

    expect(html).toContain('<section');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('Quando e onde');
    expect(html).toContain('text-meta');
    expect(html).toContain('h-px flex-1 bg-line');
  });

  it('is a plain block without a label', () => {
    const html = renderToStaticMarkup(
      <FormModalGroup>
        <input />
      </FormModalGroup>,
    );

    expect(html).not.toContain('aria-labelledby');
    expect(html).not.toContain('<h3');
  });

  it('pairs fields in two columns only through a container query', () => {
    const two = renderToStaticMarkup(
      <FormModalGroup columns={2}>
        <input />
      </FormModalGroup>,
    );
    const one = renderToStaticMarkup(
      <FormModalGroup>
        <input />
      </FormModalGroup>,
    );

    expect(two).toContain('@xl:grid-cols-2');
    expect(two).not.toContain('lg:grid-cols-2');
    expect(one).not.toContain('grid-cols-2');
  });
});

describe('FormModalSplit', () => {
  it('puts the aside before the fields and splits only in a wide container', () => {
    const html = renderToStaticMarkup(
      <FormModalSplit aside={<b>Valor</b>}>
        <i>Campos</i>
      </FormModalSplit>,
    );

    expect(html.indexOf('Valor')).toBeLessThan(html.indexOf('Campos'));
    expect(html).toContain('@xl:grid-cols-');
    expect(html).toContain('@xl:border-r');
  });
});

describe('FormModalMore', () => {
  it('starts closed: collapsed track, inert panel, aria-expanded false', () => {
    const html = renderToStaticMarkup(
      <FormModalMore summary="2 preenchidas">
        <input />
      </FormModalMore>,
    );

    expect(html).toContain('Mais opções');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('grid-rows-[0fr]');
    expect(html).toContain('inert=""');
    expect(html).toContain('2 preenchidas');
  });

  it('opens by default when asked and drops the summary', () => {
    const html = renderToStaticMarkup(
      <FormModalMore defaultOpen summary="2 preenchidas">
        <input />
      </FormModalMore>,
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('grid-rows-[1fr]');
    expect(html).not.toContain('inert=""');
    expect(html).not.toContain('2 preenchidas');
  });

  it('stays open while a field inside has an error', () => {
    const html = renderToStaticMarkup(
      <FormModalMore hasError>
        <input />
      </FormModalMore>,
    );

    expect(html).toContain('aria-expanded="true"');
  });

  it('is controlled by isOpen', () => {
    const html = renderToStaticMarkup(
      <FormModalMore isOpen={false} defaultOpen>
        <input />
      </FormModalMore>,
    );

    expect(html).toContain('aria-expanded="false"');
  });

  it('moves only with transform and opacity, apart from the row track', () => {
    const html = renderToStaticMarkup(
      <FormModalMore>
        <input />
      </FormModalMore>,
    );

    expect(html).toContain('transition-[opacity,transform]');
    expect(html).toContain('transition-[grid-template-rows]');
    expect(html).not.toContain('transition-all');
  });
});
