import {
  Banner,
  CategoryIcon,
  ContentSkeleton,
  FormModal,
  FormModalGroup,
  Money,
} from '@fincheck/ui';
import { Radio, RadioGroup } from 'react-aria-components';

import type { LinkCandidateData } from '#/features/recurrences/recurrence-list/link-occurrence/types/link-candidate.type.ts';

type LinkOccurrenceViewProps = {
  name: string;
  state: 'loading' | 'error' | 'ready';
  candidates: LinkCandidateData[];
  /** The transaction chosen (the closest one starts chosen). */
  selectedId: string | null;
  onSelect: (transactionId: string) => void;
  /** True while the link is being saved. */
  linking: boolean;
  linkError: string | null;
  onLink: () => void;
  onRetry: () => void;
  onClose: () => void;
};

/**
 * "Vincular transação": the recent transactions near the occurrence as rows to pick from, the
 * closest to the amount first and already chosen; the primary button links the chosen one.
 */
export function LinkOccurrenceView({
  name,
  state,
  candidates,
  selectedId,
  onSelect,
  linking,
  linkError,
  onLink,
  onRetry,
  onClose,
}: LinkOccurrenceViewProps) {
  const ready = state === 'ready' && candidates.length > 0;

  return (
    <FormModal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title="Vincular transação"
      description={`Qual lançamento do banco é o pagamento de ${name}?`}
      submitLabel="Vincular"
      submittingLabel="Vinculando..."
      onSubmit={onLink}
      isSubmitting={linking}
      submitDisabled={!ready || selectedId === null}
      submitHint={ready ? undefined : 'Sem transação para vincular.'}
      error={linkError ?? undefined}
    >
      {state === 'loading' ? <ContentSkeleton variant="sections" /> : null}
      {state === 'error' ? (
        <Banner
          variant="error"
          title="Não deu para buscar as transações"
          actionLabel="Tentar de novo"
          onAction={onRetry}
        />
      ) : null}
      {state === 'ready' && candidates.length === 0 ? (
        <p className="text-body text-fg-secondary">
          Nenhuma transação sem vínculo perto desta data. Se o pagamento ainda não chegou, use
          &quot;Marcar como paga&quot; na lista.
        </p>
      ) : null}
      {ready ? (
        <FormModalGroup label="Transações perto desta data">
          <RadioGroup
            aria-label="Transações perto desta data"
            value={selectedId}
            onChange={onSelect}
            isDisabled={linking}
            className="flex flex-col gap-s8"
          >
            {candidates.map((candidate) => (
              <Radio
                key={candidate.transactionId}
                value={candidate.transactionId}
                aria-label={`${candidate.description}, ${candidate.dateLabel}`}
                className="group focus-ring flex min-h-16 cursor-pointer items-center gap-s12 rounded-input border border-line px-s12 py-s8 transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[selected]:border-brand data-[selected]:bg-brand-weak"
              >
                <CategoryIcon icon="transfer" type={candidate.flow} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-emphasis text-fg-primary">
                    {candidate.description}
                  </span>
                  <span className="block truncate text-label text-fg-secondary">
                    {candidate.dateLabel}
                    {candidate.detail ? `, ${candidate.detail}` : ''}
                  </span>
                </span>
                <Money
                  cents={candidate.amountCents}
                  sign={candidate.flow === 'income' ? 'plus' : 'minus'}
                  signColumn
                  weight="plain"
                  tone={candidate.flow}
                  className="text-money-row"
                />
              </Radio>
            ))}
          </RadioGroup>
        </FormModalGroup>
      ) : null}
    </FormModal>
  );
}
