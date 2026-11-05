import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { checkSplit, SplitSumIndicator } from '#/components/transactions/index.ts';

describe('SplitSumIndicator', () => {
  it('writes "Passou" when the parts pass the total', () => {
    const html = renderToStaticMarkup(<SplitSumIndicator check={checkSplit(1000, [800, 500])} />);

    expect(html).toContain('Passou');
    expect(html).toContain('3,00');
    expect(html).toContain('data-status="over"');
  });
});
