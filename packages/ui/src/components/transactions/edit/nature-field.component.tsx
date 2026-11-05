import { ChoiceChip } from '#/components/chips/index.ts';
import { FineNote, SegmentedControl, type SegmentedOption } from '#/components/forms/index.ts';
import {} from '#/components/forms/field-classes.constant.ts';
import type {
  CounterpartOption,
  TransactionNature,
} from '#/components/transactions/edit/transaction-edit.type.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';

const BASE_OPTIONS: SegmentedOption[] = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
  { key: 'transfer', label: 'Transferência' },
];
const OUT_OF_ACCOUNT_OPTION: SegmentedOption = { key: 'out_of_account', label: 'Fora da conta' };

type NatureFieldProps = {
  nature: TransactionNature;
  onNatureChange: (nature: TransactionNature) => void;
  /** Candidates for the other leg, shown only for a transfer. */
  counterparts: readonly CounterpartOption[];
  counterpartId: string | null;
  onCounterpartChange: (id: string) => void;
  counterpartError?: string;
};

/**
 * Nature of the transaction (screens.md R6): Despesa, Receita or Transferência. "Fora da conta" is
 * listed only while the transaction has it, so it can go back to expense or income. A transfer asks
 * for its other leg.
 */
export function NatureField({
  nature,
  onNatureChange,
  counterparts,
  counterpartId,
  onCounterpartChange,
  counterpartError,
}: NatureFieldProps) {
  const options =
    nature === 'out_of_account' ? [...BASE_OPTIONS, OUT_OF_ACCOUNT_OPTION] : BASE_OPTIONS;

  return (
    <div className="flex flex-col gap-s8">
      <span className="text-label text-fg-secondary">Tipo</span>
      <SegmentedControl
        label="Tipo da transação"
        options={options}
        value={nature}
        onChange={(key) => onNatureChange(key as TransactionNature)}
      />
      {nature === 'out_of_account' ? (
        <FineNote icon="warning">
          Esta transação está fora da conta. Escolha Despesa ou Receita para ela voltar às contas.
        </FineNote>
      ) : null}
      {nature === 'transfer' ? (
        <div
          role="group"
          aria-label="Outra perna da transferência"
          className="flex flex-col gap-s8"
        >
          <span className="text-label text-fg-secondary">Outra perna da transferência</span>
          {counterparts.length > 0 ? (
            <div className="flex flex-wrap gap-s8">
              {counterparts.map((counterpart) => (
                <ChoiceChip
                  key={counterpart.id}
                  selected={counterpart.id === counterpartId}
                  onChange={() => onCounterpartChange(counterpart.id)}
                >
                  {counterpart.label}
                </ChoiceChip>
              ))}
            </div>
          ) : (
            <FineNote icon="transfer">
              Nenhuma transação de outra conta combina com esta. Quando o outro lado chegar do
              banco, ele aparece aqui.
            </FineNote>
          )}
          <FieldErrorMessage error={counterpartError} gap="s8" inField={false} />
        </div>
      ) : null}
    </div>
  );
}
