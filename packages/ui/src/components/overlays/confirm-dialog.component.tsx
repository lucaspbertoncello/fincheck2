import { Heading } from 'react-aria-components';

import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { ConfirmChangeList } from '#/components/overlays/confirm-change-list.component.tsx';
import type { ConfirmChange, ConfirmPreview } from '#/components/overlays/confirm-change.type.ts';
import { ModalActions } from '#/components/overlays/modal-actions.component.tsx';
import { ModalFrame } from '#/components/overlays/modal-frame.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  /** The sentence with the effect: "14 transações vão mudar de categoria." */
  description: string;
  /** Destructive action: danger colors, danger button and `alertdialog`. */
  destructive?: boolean;
  /** Icon in the 44 px circle; a warning for destructive, a check otherwise. */
  icon?: IconName;
  /** The "o que muda" list. */
  changes?: ConfirmChange[];
  preview?: ConfirmPreview;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** The confirm button spins while the action runs; the dialog cannot be dismissed meanwhile. */
  loading?: boolean;
};

/**
 * Confirmation dialog (components.md 13.3): required before applying a rule to the history,
 * disconnecting, restoring a backup and deleting. Presentation only: the caller closes it.
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  destructive = false,
  icon,
  changes,
  preview,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <ModalFrame
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="dialog"
      role={destructive ? 'alertdialog' : 'dialog'}
      isDismissable={!loading}
    >
      <div className="flex flex-col gap-s12">
        <span
          className={cx(
            'grid size-ctl-touch place-items-center rounded-capsule',
            destructive ? 'bg-loss-weak text-loss' : 'bg-brand-weak text-brand',
          )}
        >
          <Icon name={icon ?? (destructive ? 'warning' : 'check')} size="lg" />
        </span>
        <Heading
          slot="title"
          className="font-title text-xl leading-(--line-height-title) font-heading text-fg-primary"
        >
          {title}
        </Heading>
        <p className="text-body text-fg-secondary">{description}</p>
      </div>
      {changes && changes.length > 0 ? <ConfirmChangeList changes={changes} /> : null}
      {preview ? (
        <p className="flex flex-wrap items-center gap-x-s8 text-label text-fg-secondary">
          <s>{preview.before}</s>
          <Icon name="chevron-right" size="sm" />
          <span className="font-emphasis text-fg-primary">{preview.after}</span>
        </p>
      ) : null}
      <ModalActions>
        <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button danger={destructive} loading={loading} onPress={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalActions>
    </ModalFrame>
  );
}
