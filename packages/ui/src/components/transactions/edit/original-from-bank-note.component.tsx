import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import type { OriginalFromBank } from '#/components/transactions/edit/transaction-edit.type.ts';

type OriginalFromBankNoteProps = {
  original: OriginalFromBank;
  onRestore: () => void;
  /** Flow of the transaction: money turns red (expense) or green (income), with its sign. */
  tone?: 'income' | 'expense';
};

/** Dashed note of the edit panel: what the bank sent, kept aside, with "Restaurar original" (BR-TRX-004). */
export function OriginalFromBankNote({ original, onRestore, tone }: OriginalFromBankNoteProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-s12 gap-y-s8 rounded-input border border-dashed border-fg-tertiary px-s16 py-s12 text-label text-fg-secondary">
      <Icon name="history" size="base" />
      <p className="min-w-0 flex-1">
        Original do banco: <span className="text-fg-primary">{original.description}</span>,{' '}
        <Money
          cents={original.amountCents}
          sign="none"
          weight="plain"
          tone={tone}
          className="text-label"
        />
      </p>
      <Button variant="tertiary" size="sm" onPress={onRestore}>
        Restaurar original
      </Button>
    </div>
  );
}
