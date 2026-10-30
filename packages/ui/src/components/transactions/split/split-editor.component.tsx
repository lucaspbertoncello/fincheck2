import { Button } from '#/components/buttons/index.ts';
import { MoneyField } from '#/components/forms/index.ts';
import { Money } from '#/components/money/index.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { balanceSplitParts } from '#/components/transactions/split/balance-split-parts.util.ts';
import { CategorySelect } from '#/components/transactions/split/category-select.component.tsx';
import { checkSplit } from '#/components/transactions/split/check-split.util.ts';
import { distributeCents } from '#/components/transactions/split/distribute-cents.util.ts';
import type { SplitPart } from '#/components/transactions/split/split-part.type.ts';
import { SplitSumIndicator } from '#/components/transactions/split/split-sum-indicator.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

const DEFAULT_MAX_PARTS = 6;

type SplitEditorProps = {
  /** Total of the transaction in cents, positive. */
  totalCents: number;
  parts: readonly SplitPart[];
  onChange: (parts: SplitPart[]) => void;
  categories: readonly CategoryOption[];
  /** Makes the id of a part added by the "Adicionar parte" button. */
  createPartId: () => string;
  /** Most parts a split may have (6 by default; the API contract takes exactly 2). */
  maxParts?: number;
  onConfirm: () => void;
  onCancel: () => void;
  saving?: boolean;
  /** Server error, under the sum indicator. */
  error?: string;
  className?: string;
};

/**
 * Content of the split panel (components.md 6.1, RF-TRX-005): one row per part (label, category,
 * amount), the sum indicator and the actions. The parts must add up to the total to the cent
 * (`checkSplit`): with two parts, typing one gives the rest to the other. "Dividir" stays off until
 * it matches. The amounts are never rounded: leftover cents come from `distributeCents`.
 */
export function SplitEditor({
  totalCents,
  parts,
  onChange,
  categories,
  createPartId,
  maxParts = DEFAULT_MAX_PARTS,
  onConfirm,
  onCancel,
  saving = false,
  error,
  className,
}: SplitEditorProps) {
  const check = checkSplit(
    totalCents,
    parts.map((part) => part.amountCents),
  );

  function changeAmount(index: number, amountCents: number) {
    const amounts = balanceSplitParts(
      totalCents,
      parts.map((part) => part.amountCents),
      index,
      amountCents,
    );
    onChange(parts.map((part, position) => ({ ...part, amountCents: amounts[position] ?? 0 })));
  }

  function changeCategory(index: number, categoryId: string) {
    onChange(parts.map((part, position) => (position === index ? { ...part, categoryId } : part)));
  }

  function evenSplit(nextParts: readonly SplitPart[]) {
    const amounts = distributeCents(totalCents, nextParts.length);
    onChange(nextParts.map((part, position) => ({ ...part, amountCents: amounts[position] ?? 0 })));
  }

  return (
    <form
      noValidate
      aria-label="Dividir transação"
      onSubmit={(event) => {
        event.preventDefault();
        if (check.valid) onConfirm();
      }}
      className={cx(
        'flex flex-col gap-s16 rounded-panel border border-line bg-subtle p-s16',
        className,
      )}
    >
      <p className="flex items-baseline justify-between gap-s12 text-label text-fg-secondary">
        <span>Total a dividir</span>
        <Money
          cents={totalCents}
          sign="none"
          weight="plain"
          className="text-body text-fg-primary"
        />
      </p>
      <ul className="m-0 flex flex-col gap-s16 p-0">
        {parts.map((part, index) => (
          <li
            key={part.id}
            className="grid list-none grid-cols-2 items-end gap-s12 lg:flex lg:gap-s16"
          >
            <span className="col-span-2 text-label font-emphasis text-fg-primary lg:w-16 lg:shrink-0 lg:pb-s12">
              Parte {index + 1}
            </span>
            <CategorySelect
              label={`Categoria da parte ${index + 1}`}
              categories={categories}
              value={part.categoryId}
              onChange={(categoryId) => changeCategory(index, categoryId)}
              className="lg:flex-1"
            />
            <MoneyField
              label={`Valor da parte ${index + 1}`}
              cents={part.amountCents}
              onChange={(amountCents) => changeAmount(index, amountCents)}
              error={check.emptyPartIndexes.includes(index) ? 'Informe o valor.' : undefined}
              className="lg:w-42 lg:shrink-0"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-s8">
        <Button
          variant="tertiary"
          size="sm"
          icon="plus-circle"
          isDisabled={parts.length >= maxParts}
          onPress={() =>
            evenSplit([...parts, { id: createPartId(), categoryId: null, amountCents: 0 }])
          }
        >
          Adicionar parte
        </Button>
        {parts.length > 2 ? (
          <Button variant="tertiary" size="sm" onPress={() => evenSplit(parts.slice(0, -1))}>
            Remover a última
          </Button>
        ) : null}
        <Button variant="tertiary" size="sm" onPress={() => evenSplit(parts)}>
          Dividir por igual
        </Button>
      </div>
      <SplitSumIndicator check={check} />
      {error ? (
        <p role="alert" className="text-meta text-alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-s8 lg:flex-row lg:justify-end">
        <Button variant="secondary" onPress={onCancel} fullWidth className="lg:w-auto">
          Cancelar
        </Button>
        <Button
          type="submit"
          isDisabled={!check.valid}
          loading={saving}
          loadingLabel="Dividindo..."
          fullWidth
          className="lg:w-auto"
        >
          Dividir
        </Button>
      </div>
    </form>
  );
}
