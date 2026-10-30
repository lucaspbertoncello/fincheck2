import {
  Banner,
  Button,
  CategoryChoices,
  ContentSkeleton,
  EmptyState,
  Modal,
  ReviewProgress,
  ReviewQueueCard,
  ReviewQueueList,
  RuleSuggestionBanner,
  type CategoryOption,
  type ReviewQueueItemData,
} from '@fincheck/ui';
import type { ComponentProps } from 'react';

type ReviewQueueCardProps = ComponentProps<typeof ReviewQueueCard>;

export type ReviewQueueViewProps = {
  status: 'loading' | 'error' | 'empty' | 'ready';
  onRetry: () => void;
  onBackToTransactions: () => void;
  progress: { done: number; total: number };
  /** The transaction under review; null unless the status is "ready". */
  card: ReviewQueueCardProps | null;
  /** The failure of the last save, undo or link, kept next to the action. */
  actionError: string | null;
  /** The next ones, after the card. */
  queueItems: ReviewQueueItemData[];
  /** How many more wait beyond the ones listed. */
  hiddenCount: number;
  onChooseCandidate: (itemId: string, optionId: string) => void;
  onChooseOther: (itemId: string) => void;
  /** "Você moveu 3 transações..." offer for something saved in this visit. */
  ruleSuggestion: {
    message: string;
    onCreate: () => void;
    onDismiss: () => void;
  } | null;
  categoryPicker: {
    isOpen: boolean;
    onClose: () => void;
    categories: CategoryOption[];
    value: string | null;
    onSelect: (categoryId: string) => void;
  };
};

/** Para revisar: one transaction at a time, then "Na fila" (screens.md, Para revisar). */
export function ReviewQueueView({
  status,
  onRetry,
  onBackToTransactions,
  progress,
  card,
  actionError,
  queueItems,
  hiddenCount,
  onChooseCandidate,
  onChooseOther,
  ruleSuggestion,
  categoryPicker,
}: ReviewQueueViewProps) {
  if (status === 'loading') return <ContentSkeleton variant="list" />;

  if (status === 'error') {
    return (
      <Banner
        variant="error"
        title="Não deu para carregar a fila"
        description="Confira se a API está rodando e tente de novo."
        actionLabel="Tentar de novo"
        onAction={onRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-s24">
      <div className="flex flex-col gap-s8">
        <Button
          variant="tertiary"
          size="sm"
          icon="chevron-left"
          onPress={onBackToTransactions}
          className="self-start"
        >
          Transações
        </Button>
        <ReviewProgress done={progress.done} total={progress.total} />
      </div>

      {status === 'empty' ? (
        <EmptyState
          icon="check"
          title="Tudo revisado"
          description="Nenhuma transação sem categoria. As próximas chegam na próxima busca automática do banco."
          secondaryAction={{ label: 'Voltar para transações', onPress: onBackToTransactions }}
        />
      ) : null}

      {ruleSuggestion ? (
        <div className="flex flex-col items-end gap-s8">
          <RuleSuggestionBanner
            message={ruleSuggestion.message}
            onCreate={ruleSuggestion.onCreate}
            className="w-full"
          />
          <Button variant="tertiary" size="sm" onPress={ruleSuggestion.onDismiss}>
            Agora não
          </Button>
        </div>
      ) : null}

      {card ? <ReviewQueueCard {...card} /> : null}

      {actionError ? <Banner variant="error" title={actionError} /> : null}

      {queueItems.length > 0 ? (
        <section aria-labelledby="review-queue-heading" className="flex flex-col gap-s8">
          <h2 id="review-queue-heading" className="text-subsection font-emphasis text-fg-primary">
            Na fila
          </h2>
          <ReviewQueueList
            items={queueItems}
            onChoose={onChooseCandidate}
            onChooseOther={onChooseOther}
          />
          {hiddenCount > 0 ? (
            <p className="text-label text-fg-secondary">
              Mais {hiddenCount} {hiddenCount === 1 ? 'transação espera' : 'transações esperam'}{' '}
              depois dessas.
            </p>
          ) : null}
        </section>
      ) : null}

      <Modal
        isOpen={categoryPicker.isOpen}
        onOpenChange={(open) => {
          if (!open) categoryPicker.onClose();
        }}
        title="Escolher categoria"
      >
        <CategoryChoices
          label="Categoria"
          categories={categoryPicker.categories}
          value={categoryPicker.value}
          onChange={categoryPicker.onSelect}
        />
      </Modal>
    </div>
  );
}
