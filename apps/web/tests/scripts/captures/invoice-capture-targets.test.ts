import { afterEach, describe, expect, it } from 'vitest';

import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CAPTURE_NOW_ISO, SCREEN_TARGETS } from '#scripts/captures/capture-targets.constant.ts';
import { restoreTestClock, setTestClock } from '#tests/support/clock/set-test-clock.util.ts';

afterEach(() => {
  restoreTestClock();
});

const INVOICE_TARGETS = SCREEN_TARGETS.filter((target) => target.name.startsWith('invoice '));

function parse(path: string) {
  const match = /^\/cards\/([^/]+)\/invoices\/(\d{4}-\d{2})/.exec(path);
  if (!match?.[1] || !match[2]) throw new Error(`Not an invoice path: ${path}`);

  return { accountId: match[1], month: match[2] };
}

// The paths of the captures hold the ids of the mock seed: this test says when they drift.
describe('the invoice captures', () => {
  it('photograph the four states: open, closed, paid and with no lines', () => {
    setTestClock(new Date(CAPTURE_NOW_ISO));
    expect(INVOICE_TARGETS.map((target) => target.name)).toEqual([
      'invoice open',
      'invoice closed',
      'invoice paid',
      'invoice empty',
    ]);

    const result = INVOICE_TARGETS.map((target) => {
      const { accountId, month } = parse(target.path);
      expect(db.accounts.find((account) => account.id === accountId)?.type).toBe('credit_card');
      const { dto, items } = computeInvoice(db, accountId, month);

      return { status: dto.status, items: items.length };
    });

    expect(result[0]).toMatchObject({ status: 'open' });
    expect(result[0]?.items).toBeGreaterThanOrEqual(30);
    expect(result[1]).toMatchObject({ status: 'closed' });
    expect(result[1]?.items).toBeGreaterThan(0);
    expect(result[2]).toMatchObject({ status: 'paid' });
    expect(result[2]?.items).toBeGreaterThan(0);
    expect(result[3]?.items).toBe(0);
  });
});
