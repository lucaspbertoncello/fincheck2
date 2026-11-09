import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// The existing accounts a reconnection may adopt for an account the Pluggy sent ("Reconectar sem
// duplicar", `domain model.md` 4.8): the same bank (and the same name when the bank is `other`),
// the same type and the same final number, with no active connection. An account that never had a
// connection is not offered: Lucas made it by hand and it is not "the same one coming back". The
// final of a card is the one of the card (`last4`), or the one the old link had kept; on the others,
// the one the old link kept; two accounts that both have no final count as the same. An account
// whose old connection is `active` keeps it. The order of `candidates` is kept.
export function findAdoptionCandidates(input: {
  incoming: {
    institutionName: string;
    numberHint: string | null;
    type: 'checking' | 'savings' | 'credit_card';
  };
  institutionCode: string;
  candidates: readonly AdoptionCandidate[];
}): AdoptionCandidate[] {
  const wantedName = normalizeText(input.incoming.institutionName);

  return input.candidates.filter((candidate) => {
    if (candidate.type !== input.incoming.type || candidate.owner === null) return false;
    if (candidate.owner.connectionStatus === 'active') return false;
    if (
      input.institutionCode === 'other' &&
      normalizeText(candidate.institutionName ?? '') !== wantedName
    ) {
      return false;
    }
    const final =
      candidate.type === 'credit_card'
        ? (candidate.last4 ?? candidate.owner.numberHint)
        : candidate.owner.numberHint;

    return final === input.incoming.numberHint;
  });
}

export type AdoptionCandidate = {
  accountId: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet' | 'credit_card';
  source: 'pluggy' | 'manual';
  institutionName: string | null;
  last4: string | null;
  // The link the account has today (to an old connection); null when it never had one.
  owner: {
    connectionId: string;
    connectionStatus: 'active' | 'error' | 'disconnected';
    numberHint: string | null;
  } | null;
};
