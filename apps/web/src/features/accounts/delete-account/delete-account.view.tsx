import {
  Banner,
  Button,
  Icon,
  ModalActions,
  ModalFrame,
  Skeleton,
  type IconName,
} from '@fincheck/ui';
import { Heading } from 'react-aria-components';

import type { DeletionSummary } from '#/features/accounts/delete-account/types/deletion-summary.type.ts';

type DeleteAccountViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** "Excluir Nubank?" */
  title: string;
  state: 'loading' | 'error' | 'ready';
  summary: DeletionSummary | null;
  /** Archiving is offered while the account is not archived yet. */
  canArchive: boolean;
  failed: boolean;
  isDeleting: boolean;
  isArchiving: boolean;
  onRetry: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

function ImpactList({
  label,
  icon,
  tone,
  items,
}: {
  label: string;
  icon: IconName;
  tone: 'loss' | 'neutral';
  items: readonly string[];
}) {
  return (
    <section
      aria-label={label}
      className={`flex flex-col gap-s8 rounded-input p-s16 ${tone === 'loss' ? 'bg-loss-weak' : 'bg-subtle'}`}
    >
      <h3 className="text-meta leading-none font-emphasis text-fg-secondary">{label}</h3>
      <ul className="flex flex-col gap-s8">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-s12 text-label text-fg-primary">
            <Icon
              name={icon}
              size="sm"
              className={`mt-s4 shrink-0 ${tone === 'loss' ? 'text-loss' : 'text-fg-secondary'}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Delete confirmation with the impact counted by the API (RF-ACC-006, BR-ACC-008): what goes, what
 * stays, and "Arquivar" as the way out that loses nothing. Delete is the red button at the right.
 */
export function DeleteAccountView({
  isOpen,
  onClose,
  title,
  state,
  summary,
  canArchive,
  failed,
  isDeleting,
  isArchiving,
  onRetry,
  onArchive,
  onDelete,
}: DeleteAccountViewProps) {
  const isBusy = isDeleting || isArchiving;

  return (
    <ModalFrame
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="dialog"
      role="alertdialog"
      isDismissable={!isBusy}
      isKeyboardDismissDisabled={isBusy}
    >
      <div className="flex flex-col gap-s12">
        <span className="grid size-ctl-touch place-items-center rounded-capsule bg-loss-weak text-loss">
          <Icon name="warning" size="lg" />
        </span>
        <Heading
          slot="title"
          className="font-title text-xl leading-(--line-height-title) font-heading text-fg-primary"
        >
          {title}
        </Heading>
        <p className="text-body text-fg-secondary">
          {state === 'error'
            ? 'Não deu para calcular o que será apagado. Tente de novo.'
            : failed
              ? 'Não deu para concluir agora. Tente de novo; nada foi apagado.'
              : 'Isto não dá para desfazer. Para só tirar da vista e guardar o histórico, arquive.'}
        </p>
      </div>

      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-s8">
          <Skeleton className="h-ctl-touch w-full" />
          <Skeleton className="h-ctl-sm w-full" />
        </div>
      ) : null}

      {state === 'ready' && summary ? (
        <>
          <ImpactList
            label="O que some"
            icon="trash"
            tone="loss"
            items={
              summary.gone.length > 0 ? summary.gone : ['Só a conta: não há nada dentro dela.']
            }
          />
          <ImpactList label="O que fica" icon="check" tone="neutral" items={summary.stays} />
          {summary.returnNote ? <Banner variant="warning" title={summary.returnNote} /> : null}
        </>
      ) : null}

      <ModalActions>
        <Button variant="secondary" isDisabled={isBusy} onPress={onClose}>
          Cancelar
        </Button>
        {canArchive ? (
          <Button
            variant="secondary"
            icon="archive"
            loading={isArchiving}
            isDisabled={isDeleting || state !== 'ready'}
            onPress={onArchive}
          >
            Arquivar
          </Button>
        ) : null}
        {state === 'error' ? (
          <Button onPress={onRetry}>Tentar de novo</Button>
        ) : (
          <Button
            danger
            loading={isDeleting}
            isDisabled={isArchiving || state !== 'ready'}
            onPress={onDelete}
          >
            Excluir
          </Button>
        )}
      </ModalActions>
    </ModalFrame>
  );
}
