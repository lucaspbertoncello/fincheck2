import { describe, expect, it } from 'vitest';

import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';

describe('getBusinessDate', () => {
  it('uses the São Paulo day, not the UTC one', () => {
    expect(getBusinessDate(new Date('2026-10-23T01:30:00.000Z'))).toBe('2026-10-22');
    expect(getBusinessDate(new Date('2026-10-23T03:00:00.000Z'))).toBe('2026-10-23');
  });

  it('is today when no instant is given', () => {
    expect(getBusinessDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
