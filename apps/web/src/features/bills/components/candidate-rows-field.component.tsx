import { FieldSet, Icon, Money } from '@fincheck/ui';
import { useState } from 'react';
import { ToggleButton } from 'react-aria-components';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';

/** Rows shown before "Ver todas": enough to find the one, short enough to keep the modal still. */
const VISIBLE_ROWS = 3;

type CandidateRowsFieldProps = {
  /** Names the group ("Transação que você pagou", "Pix já feito"). */
  label: string;
  /** Marks the field as optional beside the label. */
  optional?: boolean;
  options: readonly PaymentCandidateOption[];
  /** The chosen transaction, or null for "none". */
  value: string | null;
  onChange: (transactionId: string | null) => void;
  /** Said when the list is empty. */
  emptyText: string;
  isLoading?: boolean;
  error?: string;
};

/**
 * The recent transactions that could be the one, as rows to pick from: what the bank wrote, when
 * and with whom, and the amount on the right. One row chosen at most; tapping it again clears the
 * choice. Shows a few rows and "Ver todas" for the rest.
 */
export function CandidateRowsField({
  label,
  optional = false,
  options,
  value,
  onChange,
  emptyText,
  isLoading = false,
  error,
}: CandidateRowsFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const chosenIndex = options.findIndex((option) => option.transactionId === value);
  const showAll = expanded || chosenIndex >= VISIBLE_ROWS;
  const rows = showAll ? options : options.slice(0, VISIBLE_ROWS);

  return (
    <FieldSet label={label} aside={optional ? 'opcional' : undefined} error={error}>
      {isLoading ? (
        <p className="text-label text-fg-secondary">Buscando transações...</p>
      ) : options.length === 0 ? (
        <p className="rounded-input border border-dashed border-line px-s16 py-s12 text-label text-fg-secondary">
          {emptyText}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-s8 p-0">
          {rows.map((option) => {
            const selected = option.transactionId === value;
            return (
              <li key={option.transactionId}>
                <ToggleButton
                  isSelected={selected}
                  onChange={() => onChange(selected ? null : option.transactionId)}
                  className="focus-ring flex min-h-ctl-touch w-full cursor-pointer items-center gap-s12 rounded-input border border-line px-s12 py-s8 text-left transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[selected]:border-brand data-[selected]:bg-brand-weak"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-5 shrink-0 place-items-center rounded-capsule border ${
                      selected ? 'border-brand bg-brand text-fg-on-accent' : 'border-line'
                    }`}
                  >
                    {selected ? <Icon name="check" size="sm" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-label text-fg-primary">
                      {option.description}
                    </span>
                    <span className="truncate text-meta text-fg-secondary">
                      {option.dateText}
                      {option.counterparty ? ` · ${option.counterparty}` : ''}
                    </span>
                  </span>
                  <Money cents={option.amountCents} sign="none" weight="plain" />
                </ToggleButton>
              </li>
            );
          })}
        </ul>
      )}
      {!isLoading && options.length > VISIBLE_ROWS && !showAll ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="focus-ring mt-s4 self-start rounded-capsule px-s4 text-label font-emphasis text-brand"
        >
          Ver todas ({options.length})
        </button>
      ) : null}
    </FieldSet>
  );
}
