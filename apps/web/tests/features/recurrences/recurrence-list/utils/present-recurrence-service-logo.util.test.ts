import { describe, expect, it } from 'vitest';

import type { RowContext } from '#/features/recurrences/recurrence-list/types/row-context.type.ts';
import { presentIdleRecurrence } from '#/features/recurrences/recurrence-list/utils/present-idle-recurrence.util.ts';
import { presentOccurrenceRow } from '#/features/recurrences/recurrence-list/utils/present-occurrence-row.util.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

const netflix = createTestRecurrence({
  id: 'r-netflix',
  name: 'Netflix',
  isSubscription: true,
  serviceSlug: 'netflix',
});
const other = createTestRecurrence({
  id: 'r-other',
  name: 'Clube do livro',
  isSubscription: true,
  serviceSlug: null,
});
const noLogo = createTestRecurrence({
  id: 'r-disney',
  name: 'Disney+',
  isSubscription: true,
  serviceSlug: 'disneyplus',
});
// A name that the text recognition would read as Spotify: the flag decides, not the text.
const notSubscription = createTestRecurrence({
  id: 'r-plain',
  name: 'Spotify da família',
  isSubscription: false,
});

const context: RowContext = {
  recurrences: new Map([netflix, other, noLogo, notSubscription].map((item) => [item.id, item])),
  categoryIcons: new Map(),
  accountNames: new Map(),
  today: '2026-10-22',
  hidden: false,
  pendingKey: null,
};

describe('recurrence rows and the service logo (BR-REC-017)', () => {
  it('draws the logo of a subscription with a service, on an occurrence and on an idle recurrence', () => {
    const occurrence = createTestOccurrence({
      recurrenceId: 'r-netflix',
      recurrenceName: 'Netflix',
    });

    expect(presentOccurrenceRow(occurrence, context).service).toEqual({
      name: 'Netflix',
      slug: 'netflix',
    });
    expect(presentIdleRecurrence(netflix, context).service).toEqual({
      name: 'Netflix',
      slug: 'netflix',
    });
  });

  it('keeps the category icon for "Outro", for a service with no logo file and for a non-subscription', () => {
    for (const recurrence of [other, noLogo, notSubscription]) {
      const occurrence = createTestOccurrence({
        recurrenceId: recurrence.id,
        recurrenceName: recurrence.name,
      });

      expect(presentOccurrenceRow(occurrence, context).service).toBeNull();
      expect(presentIdleRecurrence(recurrence, context).service).toBeNull();
    }
  });

  it('has no logo for an occurrence whose recurrence is not loaded', () => {
    const occurrence = createTestOccurrence({ recurrenceId: 'unknown', recurrenceName: 'Netflix' });

    expect(presentOccurrenceRow(occurrence, context).service).toBeNull();
  });
});
