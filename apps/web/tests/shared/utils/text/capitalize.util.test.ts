import { describe, expect, it } from 'vitest';

import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

describe('capitalize', () => {
  it('upper-cases only the first letter', () => {
    expect(capitalize('ontem às 03:00')).toBe('Ontem às 03:00');
    expect(capitalize('março')).toBe('Março');
    expect(capitalize('')).toBe('');
  });
});
