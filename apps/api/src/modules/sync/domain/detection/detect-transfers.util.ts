import { canTakeDetectedNature } from '#/modules/sync/domain/detection/can-take-detected-nature.util.ts';
import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';
import { pairMirrors } from '#/modules/sync/domain/detection/pair-mirrors.util.ts';

// The two legs of a transfer: opposite values within R$ 0,01, up to 2 days apart.
const LEGS = { toleranceCents: 1, maxDays: 2 } as const;

// The transfers between own accounts (`domain model.md` 4.10, detector 3; BR-TRX-006). Pure. A pair
// of accounts that are not cards, with opposite values, in different accounts and up to 2 days
// apart. It runs after the detectors of invoice payment: what they marked (`excluded`) never
// enters, so the pair debit on the account and credit on the card is not taken for a transfer. Only
// the new transactions start a search; the partner may be an older one the system still owns. The
// pairs are chosen from the closest to the farthest, and a transaction pairs once. The debit goes
// first in the pair.
export function detectTransfers(input: {
  items: readonly DetectionItem[];
  excluded: ReadonlySet<string>;
}): TransferPair[] {
  const eligible = input.items.filter(
    (item) => !item.isCard && canTakeDetectedNature(item) && !input.excluded.has(item.id),
  );

  return pairMirrors({
    positives: eligible.filter((item) => item.amountCents > 0),
    negatives: eligible.filter((item) => item.amountCents < 0),
    ...LEGS,
    accept: (credit, debit) =>
      credit.accountId !== debit.accountId && (credit.isNew || debit.isNew),
  }).map((pair) => ({ firstId: pair.negative.id, secondId: pair.positive.id }));
}

export type TransferPair = { firstId: string; secondId: string };
