import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContentSkeleton } from '#/components/states/index.ts';

const cardCount = (html: string) => (html.match(/flex flex-col gap-s12 p-s16/g) ?? []).length;

describe('ContentSkeleton overview', () => {
  it('draws 3 summary cards in 3 columns by default, like the other screens', () => {
    const html = renderToStaticMarkup(<ContentSkeleton variant="overview" />);

    expect(cardCount(html)).toBe(3);
    expect(html).toContain('lg:grid-cols-3');
  });

  it.each([1, 2] as const)('draws %i summary card(s) and fits the grid to them', (count) => {
    const html = renderToStaticMarkup(<ContentSkeleton variant="overview" summaryCards={count} />);

    expect(cardCount(html)).toBe(count);
    expect(html).toContain(`lg:grid-cols-${count}`);
    expect(html).not.toContain('lg:grid-cols-3');
  });
});
