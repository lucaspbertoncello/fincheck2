import { describe, expect, it } from 'vitest';

import { findSubscriptionSuggestions } from '#/modules/recurrences/domain/subscription/find-subscription-suggestions.util.ts';
import type { SuggestionPurchase } from '#/modules/recurrences/domain/subscription/find-subscription-suggestions.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const CARD = 'card-1';
const OTHER_CARD = 'card-2';
const TODAY = BusinessDate.of('2026-10-22');

let sequence = 0;
function purchase(
  description: string,
  on: string,
  cents: number,
  accountId: string = CARD,
): SuggestionPurchase {
  sequence += 1;

  return {
    transactionId: `t${String(sequence)}`,
    accountId,
    description,
    amountCents: cents,
    occurredOn: BusinessDate.of(on),
  };
}

function suggest(
  purchases: SuggestionPurchase[],
  options: Partial<Parameters<typeof findSubscriptionSuggestions>[0]> = {},
) {
  return findSubscriptionSuggestions({
    purchases,
    today: TODAY,
    dismissedKeys: new Set(),
    linkedTransactionIds: new Set(),
    coverage: [],
    ...options,
  });
}

describe('findSubscriptionSuggestions (BR-REC-017)', () => {
  it('suggests a description that comes back 2 months in a row on the same card', () => {
    const september = purchase('NETFLIX.COM', '2026-09-12', 5590);
    const october = purchase('NETFLIX.COM', '2026-10-12', 5590);
    const found = suggest([september, october]);

    expect(found).toHaveLength(1);
    expect(found[0]?.suggestion).toEqual({
      key: `NETFLIX.COM|${CARD}`,
      description: 'NETFLIX.COM',
      accountId: CARD,
      lastAmountCents: 5590,
      lastChargedOn: '2026-10-12',
      monthsSeen: 2,
      transactionIds: [september.transactionId, october.transactionId],
    });
    // Oldest first.
    expect(found[0]?.charges.map((charge) => charge.occurredOn.value)).toEqual([
      '2026-09-12',
      '2026-10-12',
    ]);
  });

  it('counts the months of a longer run', () => {
    const found = suggest([
      purchase('Spotify', '2026-08-03', 2190),
      purchase('Spotify', '2026-09-03', 2190),
      purchase('Spotify', '2026-10-03', 2190),
    ]);

    expect(found[0]?.suggestion.monthsSeen).toBe(3);
  });

  it('does not suggest a single charge', () => {
    expect(suggest([purchase('NETFLIX.COM', '2026-10-12', 5590)])).toEqual([]);
  });

  it('does not suggest charges that are not in 2 months in a row', () => {
    expect(
      suggest([
        purchase('NETFLIX.COM', '2026-08-12', 5590),
        purchase('NETFLIX.COM', '2026-10-12', 5590),
      ]),
    ).toEqual([]);
  });

  it('does not suggest two charges in the same month', () => {
    expect(
      suggest([
        purchase('PADARIA SAO JOAO', '2026-10-02', 1500),
        purchase('PADARIA SAO JOAO', '2026-10-12', 1500),
        purchase('LOJA TESTE', '2026-09-12', 5590),
        purchase('LOJA TESTE', '2026-10-12', 5590),
        purchase('LOJA TESTE', '2026-10-14', 5590),
      ]),
    ).toEqual([]);
  });

  describe('amount, within 15% of the charge after it', () => {
    it('accepts 15% of the charge after it on the edge and refuses a cent beyond', () => {
      expect(
        suggest([
          purchase('STREAM X', '2026-09-12', 10000),
          purchase('STREAM X', '2026-10-12', 11764),
        ]),
      ).toHaveLength(1);
      expect(
        suggest([
          purchase('STREAM X', '2026-09-12', 10000),
          purchase('STREAM X', '2026-10-12', 11765),
        ]),
      ).toEqual([]);
    });

    it('compares each month with the one after it, and stops the run where the price jumped', () => {
      const found = suggest([
        purchase('STREAM X', '2026-07-12', 1000),
        purchase('STREAM X', '2026-08-12', 5000),
        purchase('STREAM X', '2026-09-12', 5100),
        purchase('STREAM X', '2026-10-12', 5200),
      ]);

      expect(found[0]?.suggestion.monthsSeen).toBe(3);
    });
  });

  describe('day, within 5 days of the charge after it', () => {
    it('accepts 5 days and refuses 6', () => {
      expect(
        suggest([
          purchase('STREAM X', '2026-09-07', 5590),
          purchase('STREAM X', '2026-10-12', 5590),
        ]),
      ).toHaveLength(1);
      expect(
        suggest([
          purchase('STREAM X', '2026-09-06', 5590),
          purchase('STREAM X', '2026-10-12', 5590),
        ]),
      ).toEqual([]);
    });

    it('sees the end and the start of a month as close: the 30th and the 2nd are 3 days apart', () => {
      expect(
        suggest([
          purchase('STREAM X', '2026-09-30', 5590),
          purchase('STREAM X', '2026-10-02', 5590),
        ]),
      ).toHaveLength(1);
    });

    it('holds a day 31 at the end of a shorter month: 31/08 and 30/09 are the same day of the card', () => {
      expect(
        suggest([
          purchase('STREAM X', '2026-08-31', 5590),
          purchase('STREAM X', '2026-09-30', 5590),
        ]),
      ).toHaveLength(1);
    });
  });

  describe('the last charge is recent', () => {
    it('suggests when it was last month and not when it was before', () => {
      expect(
        suggest([
          purchase('STREAM X', '2026-08-12', 5590),
          purchase('STREAM X', '2026-09-12', 5590),
        ]),
      ).toHaveLength(1);
      expect(
        suggest([
          purchase('STREAM X', '2026-07-12', 5590),
          purchase('STREAM X', '2026-08-12', 5590),
        ]),
      ).toEqual([]);
    });
  });

  describe('what never becomes a suggestion', () => {
    it.each([
      ['delivery', 'IFOOD *RESTAURANTE'],
      ['Rappi', 'RAPPI BRASIL'],
      ['a restaurant', 'RESTAURANTE DO ZE'],
      ['groceries', 'SUPERMERCADO ABC'],
      ['a ride app', 'UBER *TRIP'],
      ['fuel', 'POSTO SHELL'],
    ])(
      'leaves out %s (the exclusion list of the shared package, 06/11/2026)',
      (_name, description) => {
        expect(
          suggest([
            purchase(description, '2026-09-12', 5590),
            purchase(description, '2026-10-12', 5590),
          ]),
        ).toEqual([]);
      },
    );

    it('still suggests a membership that carries the name of a delivery service', () => {
      expect(
        suggest([
          purchase('IFOOD CLUBE', '2026-09-12', 1990),
          purchase('IFOOD CLUBE', '2026-10-12', 1990),
        ]),
      ).toHaveLength(1);
    });

    it('leaves out what Lucas dismissed', () => {
      expect(
        suggest(
          [
            purchase('NETFLIX.COM', '2026-09-12', 5590),
            purchase('NETFLIX.COM', '2026-10-12', 5590),
          ],
          { dismissedKeys: new Set([`NETFLIX.COM|${CARD}`]) },
        ),
      ).toEqual([]);
    });

    it('keeps suggesting the same description on another card when only one was dismissed', () => {
      const found = suggest(
        [
          purchase('NETFLIX.COM', '2026-09-12', 5590, OTHER_CARD),
          purchase('NETFLIX.COM', '2026-10-12', 5590, OTHER_CARD),
        ],
        { dismissedKeys: new Set([`NETFLIX.COM|${CARD}`]) },
      );

      expect(found.map((item) => item.suggestion.accountId)).toEqual([OTHER_CARD]);
    });

    it('leaves out charges that already pay a recurrence that is alive', () => {
      const first = purchase('NETFLIX.COM', '2026-09-12', 5590);
      const second = purchase('NETFLIX.COM', '2026-10-12', 5590);

      expect(
        suggest([first, second], { linkedTransactionIds: new Set([first.transactionId]) }),
      ).toEqual([]);
    });

    it('does not let a short text cover a description that only has it inside a longer word', () => {
      const purchases = [
        purchase('MAXXY ACADEMIA', '2026-09-12', 8990),
        purchase('MAXXY ACADEMIA', '2026-10-12', 8990),
        purchase('HBO MAX', '2026-09-05', 3490),
        purchase('HBO MAX', '2026-10-05', 3490),
      ];

      const found = suggest(purchases, { coverage: [{ accountId: CARD, pattern: 'MAX' }] });

      expect(found.map((item) => item.suggestion.description)).toEqual(['MAXXY ACADEMIA']);
    });

    it('leaves out what a recurrence on the same card already covers, by its text', () => {
      const purchases = [
        purchase('NETFLIX.COM', '2026-09-12', 5590),
        purchase('NETFLIX.COM', '2026-10-12', 5590),
      ];

      expect(suggest(purchases, { coverage: [{ accountId: CARD, pattern: 'NETFLIX' }] })).toEqual(
        [],
      );
      // Another card, or another text: it is not covered.
      expect(
        suggest(purchases, { coverage: [{ accountId: OTHER_CARD, pattern: 'NETFLIX' }] }),
      ).toHaveLength(1);
      expect(
        suggest(purchases, { coverage: [{ accountId: CARD, pattern: 'SPOTIFY' }] }),
      ).toHaveLength(1);
    });
  });

  it('groups the description without the installment "n/N" and without case or accent', () => {
    const found = suggest([
      purchase('Assinatura Café 01/12', '2026-09-12', 3000),
      purchase('ASSINATURA CAFE 02/12', '2026-10-12', 3000),
    ]);

    expect(found).toHaveLength(1);
    expect(found[0]?.suggestion.key).toBe(`ASSINATURA CAFE|${CARD}`);
  });

  it('orders by the last charge, newest first, then by key', () => {
    const found = suggest([
      purchase('AAA', '2026-09-05', 1000),
      purchase('AAA', '2026-10-05', 1000),
      purchase('BBB', '2026-09-20', 2000),
      purchase('BBB', '2026-10-20', 2000),
    ]);

    expect(found.map((item) => item.suggestion.description)).toEqual(['BBB', 'AAA']);
  });
});
