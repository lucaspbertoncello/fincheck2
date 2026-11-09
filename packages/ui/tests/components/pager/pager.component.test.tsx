import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PagerArrows, PagerTrack } from '#/components/pager/index.ts';

const noop = () => undefined;

function arrows(isPreviousDisabled: boolean, isNextDisabled: boolean) {
  return renderToStaticMarkup(
    <PagerArrows
      previousLabel="Cartões anteriores"
      nextLabel="Próximos cartões"
      onPrevious={noop}
      onNext={noop}
      isPreviousDisabled={isPreviousDisabled}
      isNextDisabled={isNextDisabled}
    />,
  );
}

describe('PagerArrows', () => {
  it('has the two arrows named, in a group, with the chevrons the month picker uses', () => {
    const html = arrows(false, false);

    expect(html).toContain('aria-label="Cartões anteriores"');
    expect(html).toContain('aria-label="Próximos cartões"');
    expect(html).toContain('role="group"');
    expect(html).not.toContain('aria-disabled="true"');
  });

  it('disables the arrow that is at its end and only that one', () => {
    const atStart = arrows(true, false);
    const atEnd = arrows(false, true);

    expect(atStart.match(/aria-disabled="true"/g)).toHaveLength(1);
    expect(atStart).toMatch(/aria-label="Cartões anteriores"[^>]*aria-disabled="true"/);
    expect(atEnd.match(/aria-disabled="true"/g)).toHaveLength(1);
    expect(atEnd).toMatch(/aria-label="Próximos cartões"[^>]*aria-disabled="true"/);
  });
});

describe('PagerTrack', () => {
  const html = renderToStaticMarkup(
    <PagerTrack trackRef={noop} label="Cartões de crédito">
      <div>um</div>
      <div>dois</div>
    </PagerTrack>,
  );

  it('snaps with no scroll bar: one slide per page on the phone, two from the desktop width', () => {
    expect(html).toContain('snap-x snap-mandatory');
    expect(html).toContain('scrollbar-none');
    expect(html).toContain('auto-cols-[100%]');
    expect(html).toContain('lg:auto-cols-[calc((100%-var(--spacing-s24))/2)]');
    expect(html).toContain('[&amp;&gt;*]:snap-start');
  });

  it('keeps the gaps of the grids of the screen and room for the shadows of the slides', () => {
    expect(html).toContain('gap-s16');
    expect(html).toContain('lg:gap-s24');
    expect(html).toContain('-m-s4');
    expect(html).toContain('p-s4');
  });

  it('is a labelled group the keyboard can reach, and holds the slides', () => {
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Cartões de crédito"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('<div>um</div><div>dois</div>');
  });
});
