import { renderToStaticMarkup } from 'react-dom/server';
import { TextField as AriaTextField } from 'react-aria-components';
import { describe, expect, it } from 'vitest';

import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';
import { BannerSlot } from '#/components/feedback/banner-slot.component.tsx';

describe('FieldErrorMessage', () => {
  it('without error: a folded, empty slot that cancels the column gap', () => {
    const html = renderToStaticMarkup(
      <AriaTextField>
        <FieldErrorMessage error={undefined} />
      </AriaTextField>,
    );

    expect(html).toContain('grid-rows-[0fr]');
    expect(html).toContain('-mt-s4');
    expect(html).not.toContain('role="alert"');
  });

  it('with error: open, the text in the errorMessage slot, the gap given back', () => {
    const html = renderToStaticMarkup(
      <AriaTextField>
        <FieldErrorMessage error="Informe o valor." />
      </AriaTextField>,
    );

    expect(html).toContain('grid-rows-[1fr]');
    expect(html).toContain('Informe o valor.');
    expect(html).toContain('pt-s4');
  });

  it('outside a React Aria field it is a plain alert', () => {
    const html = renderToStaticMarkup(<FieldErrorMessage error="Escolha um." inField={false} />);

    expect(html).toContain('role="alert"');
  });
});

describe('BannerSlot', () => {
  it('folds with nothing inside and opens with the banner', () => {
    expect(
      renderToStaticMarkup(
        <BannerSlot isOpen={false}>
          <p>Falhou</p>
        </BannerSlot>,
      ),
    ).not.toContain('Falhou');
    const open = renderToStaticMarkup(
      <BannerSlot isOpen>
        <p>Falhou</p>
      </BannerSlot>,
    );
    expect(open).toContain('Falhou');
    expect(open).toContain('grid-rows-[1fr]');
  });
});
