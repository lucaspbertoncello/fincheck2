import { ChoiceChip, Money } from '@fincheck/ui';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';

type PaymentCandidatePickerProps = {
  /** Names the group ("Pix ligado a esta dívida", "Transação que você pagou"). */
  label: string;
  /** Marks the field as optional beside the label. */
  optional?: boolean;
  options: readonly PaymentCandidateOption[];
  /** The chosen transaction, or null for "none". */
  value: string | null;
  onChange: (transactionId: string | null) => void;
  /** The "none" choice ("Sem Pix por enquanto"). */
  noneLabel: string;
  /** Said when the list is empty. */
  emptyText: string;
  isLoading?: boolean;
};

/** One choice among the recent transactions that could be the Pix of a payment, plus "none". */
export function PaymentCandidatePicker({
  label,
  optional = false,
  options,
  value,
  onChange,
  noneLabel,
  emptyText,
  isLoading = false,
}: PaymentCandidatePickerProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-s8">
      <span className="text-label text-fg-secondary">
        {label}
        {optional ? <span className="ml-s8 text-meta text-fg-tertiary">opcional</span> : null}
      </span>
      {isLoading ? (
        <p className="text-label text-fg-secondary">Buscando transações...</p>
      ) : (
        <div className="flex flex-wrap gap-s8">
          {options.map((option) => (
            <ChoiceChip
              key={option.transactionId}
              selected={option.transactionId === value}
              onChange={(selected) => onChange(selected ? option.transactionId : null)}
            >
              <span className="max-w-48 truncate">{option.description}</span>
              <span className="text-fg-secondary">{option.dateText}</span>
              <Money cents={option.amountCents} sign="none" weight="plain" />
            </ChoiceChip>
          ))}
          <ChoiceChip ghost selected={value === null} onChange={() => onChange(null)}>
            {noneLabel}
          </ChoiceChip>
        </div>
      )}
      {!isLoading && options.length === 0 ? (
        <p className="text-meta text-fg-secondary">{emptyText}</p>
      ) : null}
    </div>
  );
}
