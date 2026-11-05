import { useId, useRef, type FormEvent, type ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { Collapse } from '#/components/disclosure/collapse.component.tsx';
import { Banner } from '#/components/feedback/banner.component.tsx';
import { useInitialFocus } from '#/components/form-modal/use-initial-focus.hook.ts';
import { ModalFrame } from '#/components/overlays/modal-frame.component.tsx';
import { ModalHeader } from '#/components/overlays/modal-header.component.tsx';
import type { ModalSize } from '#/components/overlays/modal-size.constant.ts';
import type { FormModalDestructive } from '#/components/form-modal/form-modal.type.ts';

type FormModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Same component creates and edits: only the words change ("Nova transação" / "Editar transação"). */
  title: string;
  /** One short line under the title: what this form does to the user's money. */
  description?: string;
  /** Primary action ("Adicionar", "Salvar"). */
  submitLabel: string;
  /** Label while the save runs ("Salvando..."). */
  submittingLabel?: string;
  cancelLabel?: string;
  /** Runs on Enter and on the primary button. The caller validates and shows the errors. */
  onSubmit: () => void;
  /** The primary button spins, Esc and a click outside do not close. */
  isSubmitting?: boolean;
  /** The primary button waits (no valid amount yet). Say why in `submitHint`. */
  submitDisabled?: boolean;
  /** Next to the actions, in words: why the primary action is disabled. */
  submitHint?: string;
  /** General error of the save ("Não deu para salvar. Tente de novo."). Field errors stay in the fields. */
  error?: string;
  /** Edit only: the destructive action, alone at the left of the footer. */
  destructive?: FormModalDestructive;
  /** `form` (760, two columns) by default; `wide` (640) and `default` (480) for short forms. */
  size?: Extract<ModalSize, 'form' | 'wide' | 'default'>;
  /** CSS selector of the field that gets the focus on open. Default: the first text field. */
  initialFocus?: string;
  /** `FormModalGroup`, `FormModalSplit` and `FormModalMore`. */
  children: ReactNode;
};

type FormModalFormProps = Omit<FormModalProps, 'isOpen' | 'size'>;

function FormModalForm({
  onOpenChange,
  title,
  description,
  submitLabel,
  submittingLabel = 'Salvando...',
  cancelLabel = 'Cancelar',
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  submitHint,
  error,
  destructive,
  initialFocus,
  children,
}: FormModalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  useInitialFocus(formRef, initialFocus);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSubmitting) onSubmit();
  };

  return (
    <>
      <div aria-hidden="true" className="flex justify-center pt-s8 lg:hidden">
        <span className="h-(--size-sheet-handle-height) w-(--size-sheet-handle-width) rounded-capsule bg-(--color-sheet-handle)" />
      </div>
      <form
        id={formId}
        ref={formRef}
        noValidate
        onSubmit={submit}
        aria-busy={isSubmitting || undefined}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ModalHeader
          mark
          title={title}
          subtitle={description}
          className="px-s16 pt-s4 pb-s12 lg:px-s24 lg:pt-s24 lg:pb-s16"
        />
        <div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain px-s16 pt-s4 pb-s16 lg:px-s24">
          <div className="flex flex-col gap-s16 lg:gap-s24">
            {children}
            <Collapse
              isOpen={Boolean(error)}
              trackClassName="-mt-s16 lg:-mt-s24"
              contentClassName="pt-s16 lg:pt-s24"
            >
              {error ? <Banner variant="error" title={error} /> : null}
            </Collapse>
          </div>
        </div>
        <footer className="flex flex-col gap-s8 border-t border-line px-s16 py-s12 lg:flex-row lg:items-center lg:gap-s12 lg:px-s24 lg:py-s16">
          {submitHint ? (
            <p aria-live="polite" className="text-meta text-fg-secondary lg:order-2 lg:flex-1">
              {submitHint}
            </p>
          ) : null}
          <div className="flex items-center gap-s8 lg:contents">
            {destructive ? (
              <Button
                variant="tertiary"
                danger
                icon={destructive.icon ?? 'trash'}
                isDisabled={isSubmitting}
                onPress={destructive.onPress}
                className="mr-auto max-lg:px-s12 lg:order-1"
              >
                {destructive.label}
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-s8 lg:order-3 lg:gap-s12">
              <Button
                variant="secondary"
                isDisabled={isSubmitting}
                onPress={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loadingLabel={submittingLabel}
                isDisabled={submitDisabled}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </>
  );
}

/**
 * The one modal of every form in the app, to create and to edit (components.md "Padrão de modal").
 * Desktop: centered panel; phone: a sheet with a handle, 16 from the sides, above the bottom bar.
 * Anatomy, top to bottom: header (card-dot, title, one line, close), body in groups
 * (`FormModalGroup`, with `FormModalSplit` for a hero and `FormModalMore` for the rare fields),
 * footer (destructive at the left, why-disabled hint, Cancelar and the primary at the right).
 * Only the body scrolls, and only when the screen is too short; header and footer stay. Enter
 * submits, Esc closes (not while saving), the focus starts in the first text field.
 */
export function FormModal({ isOpen, onOpenChange, size = 'form', ...form }: FormModalProps) {
  return (
    <ModalFrame
      bare
      tall
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size={size}
      isDismissable={!form.isSubmitting}
      isKeyboardDismissDisabled={form.isSubmitting}
    >
      <FormModalForm onOpenChange={onOpenChange} {...form} />
    </ModalFrame>
  );
}
