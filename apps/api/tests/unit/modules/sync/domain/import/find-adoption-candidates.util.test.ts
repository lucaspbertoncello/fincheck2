import { describe, expect, it } from 'vitest';

import { findAdoptionCandidates } from '#/modules/sync/domain/import/find-adoption-candidates.util.ts';
import type { AdoptionCandidate } from '#/modules/sync/domain/import/find-adoption-candidates.util.ts';

const candidate = (overrides: Partial<AdoptionCandidate> = {}): AdoptionCandidate => ({
  accountId: 'a1',
  name: 'Conta Nubank',
  type: 'checking',
  source: 'pluggy',
  institutionName: null,
  last4: null,
  owner: { connectionId: 'c1', connectionStatus: 'disconnected', numberHint: '4321' },
  ...overrides,
});

const find = (
  candidates: AdoptionCandidate[],
  incoming: Partial<{
    institutionName: string;
    numberHint: string | null;
    type: 'checking' | 'savings' | 'credit_card';
  }> = {},
  institutionCode = 'nubank',
) =>
  findAdoptionCandidates({
    incoming: { institutionName: 'Nubank', numberHint: '4321', type: 'checking', ...incoming },
    institutionCode,
    candidates,
  }).map((found) => found.accountId);

describe('findAdoptionCandidates', () => {
  it('an account of the same type and final whose connection ended is a candidate', () => {
    expect(find([candidate()])).toEqual(['a1']);
  });

  it('a connection in error counts as without an active connection', () => {
    const inError = candidate({
      owner: { connectionId: 'c1', connectionStatus: 'error', numberHint: '4321' },
    });

    expect(find([inError])).toEqual(['a1']);
  });

  it('an account whose connection is active keeps it', () => {
    const active = candidate({
      owner: { connectionId: 'c1', connectionStatus: 'active', numberHint: '4321' },
    });

    expect(find([active])).toEqual([]);
  });

  it('an account that never had a connection (made by hand) is not offered', () => {
    expect(find([candidate({ owner: null })])).toEqual([]);
  });

  it('another type is not a candidate', () => {
    expect(find([candidate({ type: 'savings' })])).toEqual([]);
  });

  it('another final is not a candidate', () => {
    expect(find([candidate()], { numberHint: '9999' })).toEqual([]);
  });

  it('two accounts that both have no final are the same one', () => {
    const noFinal = candidate({
      owner: { connectionId: 'c1', connectionStatus: 'disconnected', numberHint: null },
    });

    expect(find([noFinal], { numberHint: null })).toEqual(['a1']);
    expect(find([noFinal], { numberHint: '4321' })).toEqual([]);
  });

  it('the final of a card is the one of the card, and the one of the old link when the card has none', () => {
    const card = (last4: string | null, hint: string | null) =>
      candidate({
        type: 'credit_card',
        last4,
        owner: { connectionId: 'c1', connectionStatus: 'disconnected', numberHint: hint },
      });

    expect(find([card('1234', '0000')], { type: 'credit_card', numberHint: '1234' })).toEqual([
      'a1',
    ]);
    expect(find([card(null, '1234')], { type: 'credit_card', numberHint: '1234' })).toEqual(['a1']);
    expect(find([card('1234', '1234')], { type: 'credit_card', numberHint: '9999' })).toEqual([]);
  });

  it('a bank `other` is told by its name, without case or accent', () => {
    const sicredi = candidate({ institutionName: 'Sicredí' });
    const other = candidate({ accountId: 'a2', institutionName: 'Cresol' });

    expect(find([sicredi, other], { institutionName: 'SICREDI' }, 'other')).toEqual(['a1']);
  });

  it('keeps the order it received, and offers several when there are several', () => {
    const first = candidate({ accountId: 'a1' });
    const second = candidate({ accountId: 'a2' });

    expect(find([first, second])).toEqual(['a1', 'a2']);
  });
});
