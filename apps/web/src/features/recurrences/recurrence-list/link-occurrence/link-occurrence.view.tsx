import { Banner, Button, CategoryIcon, ContentSkeleton, Modal, Money } from '@fincheck/ui';

import type { LinkCandidateData } from '#/features/recurrences/recurrence-list/link-occurrence/types/link-candidate.type.ts';

type LinkOccurrenceViewProps = {
  name: string;
  state: 'loading' | 'error' | 'ready';
  candidates: LinkCandidateData[];
  /** Transaction being linked right now. */
  linkingId: string | null;
  linkError: string | null;
  onLink: (transactionId: string) => void;
  onRetry: () => void;
  onClose: () => void;
};

/** "Vincular transação": the recent transactions near the occurrence, closest to the amount first. */
export function LinkOccurrenceView({
  name,
  state,
  candidates,
  linkingId,
  linkError,
  onLink,
  onRetry,
  onClose,
}: LinkOccurrenceViewProps) {
  return (
    <Modal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      isDismissable={linkingId === null}
      title="Vincular transação"
      subtitle={`Qual lançamento do banco é o pagamento de ${name}?`}
      actions={
        <Button variant="secondary" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      {linkError ? (
        <Banner variant="error" title="Não foi possível vincular" description={linkError} />
      ) : null}
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
      {state === 'ready' && candidates.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line">
          {candidates.map((candidate) => (
            <li key={candidate.transactionId} className="flex items-center gap-s12 py-s12">
              <CategoryIcon icon="transfer" type={candidate.flow} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-emphasis text-fg-primary">
                  {candidate.description}
                </p>
                <p className="text-label text-fg-secondary">
                  {candidate.dateLabel}
                  {candidate.detail ? `, ${candidate.detail}` : ''}
                </p>
              </div>
              <Money
                cents={candidate.amountCents}
                sign={candidate.flow === 'income' ? 'plus' : 'minus'}
                signColumn
                weight="plain"
                tone={candidate.flow === 'income' ? 'income' : 'inherit'}
                className="text-money-row"
              />
              <Button
                size="sm"
                variant="secondary"
                loading={linkingId === candidate.transactionId}
                isDisabled={linkingId !== null}
                onPress={() => onLink(candidate.transactionId)}
              >
                Vincular
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
