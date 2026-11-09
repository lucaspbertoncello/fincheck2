import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { describe, expect, it } from 'vitest';

import { buildSubscriptionAlert } from '#/features/recurrences/subscription-list/utils/build-subscription-alert.util.ts';
import { buildSubscriptionStatusNote } from '#/features/recurrences/subscription-list/utils/build-subscription-status-note.util.ts';
import { formatSuggestionName } from '#/features/recurrences/subscription-list/utils/format-suggestion-name.util.ts';
import { presentSubscriptionSuggestion } from '#/features/recurrences/subscription-list/utils/present-subscription-suggestion.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

function item(overrides: Partial<Subscription.Item> = {}, expectedOn: string | null = null) {
  const subscription: Subscription.Item = {
    recurrence: {
      ...createTestRecurrence({ name: 'Streamflix', method: 'credit' }),
      occurrence: expectedOn
        ? ({
            expectedOn,
            windowEndOn: '2026-10-25',
            payments: [],
          } as unknown as Subscription.Item['recurrence']['occurrence'])
        : null,
    },
    chargeDay: 20,
    status: 'upcoming',
    lastChargeCents: null,
    alert: null,
    ...overrides,
  };

  return subscription;
}

describe('buildSubscriptionAlert', () => {
  it('says the price went up with both amounts, and offers to update', () => {
    expect(
      buildSubscriptionAlert(
        item({ alert: { kind: 'price_changed', fromCents: 5590, toCents: 5990 } }),
        false,
      ),
    ).toEqual({
      kind: 'price_changed',
      text: 'Subiu de R$\u00a055,90 para R$\u00a059,90',
      actionLabel: 'Atualizar valor',
    });
  });

  it('asks if it was cancelled when it did not charge, and offers to end', () => {
    expect(buildSubscriptionAlert(item({ alert: { kind: 'missed' } }), false)).toEqual({
      kind: 'missed',
      text: 'Não cobrou este mês. Cancelou?',
      actionLabel: 'Encerrar',
    });
  });

  it('only tells that it charged after it ended, with no button', () => {
    const alert = buildSubscriptionAlert(
      item({
        alert: {
          kind: 'charged_after_end',
          amountCents: 5590,
          occurredOn: '2026-10-20',
          transactionId: 'tx',
        },
      }),
      false,
    );

    expect(alert).toEqual({
      kind: 'charged_after_end',
      text: 'Streamflix cobrou R$\u00a055,90 depois de encerrada',
    });
  });

  it('masks the amounts with the same shape when the values are hidden, and has no alert without one', () => {
    expect(
      buildSubscriptionAlert(
        item({ alert: { kind: 'price_changed', fromCents: 5590, toCents: 5990 } }),
        true,
      )?.text,
    ).toBe('Subiu de R$\u00a0••,•• para R$\u00a0••,••');
    expect(buildSubscriptionAlert(item(), false)).toBeNull();
  });
});

describe('buildSubscriptionStatusNote', () => {
  const today = '2026-10-22';

  it('says when it is expected, counting the days', () => {
    expect(buildSubscriptionStatusNote(item({}, '2026-10-22'), today)).toBe('Hoje');
    expect(buildSubscriptionStatusNote(item({}, '2026-10-23'), today)).toBe('Amanhã');
    expect(buildSubscriptionStatusNote(item({}, '2026-10-27'), today)).toBe('Em 5 dias');
    expect(buildSubscriptionStatusNote(item({}, '2026-10-20'), today)).toBe('Esperada até 25/10');
  });

  it('says the day of the charge when the month has no occurrence', () => {
    expect(buildSubscriptionStatusNote(item(), today)).toBe('Todo dia 20');
  });

  it('says when it did not charge and when it charged', () => {
    expect(buildSubscriptionStatusNote(item({ status: 'missed' }, '2026-10-14'), today)).toBe(
      'Esperada 14/10',
    );
    expect(buildSubscriptionStatusNote(item({ status: 'charged' }), today)).toBe(
      'Cobrada neste mês',
    );
    expect(
      buildSubscriptionStatusNote(
        item({
          alert: {
            kind: 'charged_after_end',
            amountCents: 100,
            occurredOn: '2026-10-19',
            transactionId: 'tx',
          },
        }),
        today,
      ),
    ).toBe('Cobrada 19/10');
  });
});

describe('suggestion presentation', () => {
  const suggestion: Subscription.Suggestion = {
    key: 'PODCAST PLUS|card',
    description: 'PODCAST PLUS',
    accountId: 'card',
    lastAmountCents: 1990,
    lastChargedOn: '2026-10-12',
    monthsSeen: 3,
    transactionIds: ['a', 'b', 'c'],
  };

  it('writes the name the way a person would', () => {
    expect(formatSuggestionName('  PODCAST PLUS ')).toBe('Podcast Plus');
  });

  it('says "Parece uma assinatura: nome, valor" and where it was seen', () => {
    expect(
      presentSubscriptionSuggestion(suggestion, new Map([['card', 'Roxinho']]), false),
    ).toEqual({
      key: 'PODCAST PLUS|card',
      name: 'Podcast Plus',
      service: null,
      serviceSlug: null,
      title: 'Parece uma assinatura: Podcast Plus, R$\u00a019,90',
      description: 'Cobrada em 3 meses seguidos no Roxinho, a última em 12/10.',
    });
  });

  it('carries the service the description points to, for the logo of the banner', () => {
    const spotify = { ...suggestion, description: 'SPOTIFY PREMIUM' };

    expect(presentSubscriptionSuggestion(spotify, new Map(), false).service).toEqual({
      name: 'Spotify',
      slug: 'spotify',
    });
  });

  it('carries the slug it recognized, even for a service with no logo file, to send on "Acompanhar"', () => {
    const anthropic = { ...suggestion, description: 'ANTHROPIC' };
    const prime = { ...suggestion, description: 'AMAZON PRIME BR' };

    expect(presentSubscriptionSuggestion(anthropic, new Map(), false).serviceSlug).toBe('claude');
    expect(presentSubscriptionSuggestion(prime, new Map(), false).serviceSlug).toBe('primevideo');
  });

  it('masks the amount of the title when the values are hidden', () => {
    expect(presentSubscriptionSuggestion(suggestion, new Map(), true).title).toBe(
      'Parece uma assinatura: Podcast Plus, R$\u00a0••,••',
    );
  });
});
