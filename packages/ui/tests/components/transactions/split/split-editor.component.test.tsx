import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SplitSumIndicator } from '#/components/transactions/index.ts';

describe('SplitSumIndicator', () => {
  it('writes "Passou" when the parts pass the total', () => {
    const html = renderToStaticMarkup(<SplitSumIndicator status="over" differenceCents={-300} />);

    expect(html).toContain('Passou');
    expect(html).toContain('3,00');
    expect(html).toContain('data-status="over"');
  });
});
