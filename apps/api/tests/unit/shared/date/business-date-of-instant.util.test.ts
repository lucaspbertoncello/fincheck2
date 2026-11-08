import { describe, expect, it } from 'vitest';

import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

describe('businessDateOfInstant', () => {
  it('gives the São Paulo day of an instant', () => {
    expect(businessDateOfInstant('2026-11-06T15:00:00.000Z').value).toBe('2026-11-06');
  });

  it('is still the day before at 23:59 in São Paulo, when UTC is already the next day', () => {
    expect(businessDateOfInstant('2026-11-07T02:59:59.000Z').value).toBe('2026-11-06');
    expect(businessDateOfInstant('2026-11-07T03:00:00.000Z').value).toBe('2026-11-07');
  });

  it('turns the year in São Paulo, not in UTC', () => {
    expect(businessDateOfInstant('2027-01-01T02:59:00.000Z').value).toBe('2026-12-31');
    expect(businessDateOfInstant('2027-01-01T03:00:00.000Z').value).toBe('2027-01-01');
  });

  it('takes milliseconds too', () => {
    expect(businessDateOfInstant(Date.parse('2026-11-07T02:00:00.000Z')).value).toBe('2026-11-06');
  });
});
