import { useContext, useEffect, useRef, useState } from 'react';
import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastStateContext as ToastStateContext,
  type ToastProps as AriaToastProps,
} from 'react-aria-components';

import type { UndoToastContent } from '#/components/feedback/toast.type.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type UndoToastProps = {
  toast: AriaToastProps<UndoToastContent>['toast'];
};

/** The exit lasts as long as the entrance (`--duration-pop`, 180 ms in `tokens.css`). */
const EXIT_MS = 180;

/**
 * One toast (components.md 13.1): dark pill, 52 tall, message at 15, the action at 44 and a "×" at
 * the right end ("Fechar aviso" for a screen reader). Phone: full width, radius 16. The action runs
 * `onAction` and then closes the toast (the `close` slot). The "×" and Esc (with the focus on the
 * toast) only hide it: what was done stays and the undo is no longer offered. They leave with the
 * entrance reversed (scale and fade, `pop-out`); reduced motion shortens it to 1 ms in
 * `fincheck.css`. Lives inside `ToastProvider`'s region, which is the `aria-live` area.
 */
export function UndoToast({ toast }: UndoToastProps) {
  const { message, actionLabel, onAction, withIcon } = toast.content;
  const state = useContext(ToastStateContext);
  const ref = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [leaving, setLeaving] = useState(false);

  function dismiss() {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = setTimeout(() => state?.close(toast.key), EXIT_MS);
  }

  // The region's own keyboard handling has no Esc; the toast closes itself when it holds the focus.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      dismiss();
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  return (
    <AriaToast
      ref={ref}
      toast={toast}
      inert={leaving || undefined}
      className={cx(
        'pointer-events-auto flex min-h-13 w-full origin-bottom items-center gap-s12 rounded-panel bg-(--color-toast-bg) py-s8 pr-s8 pl-s16 text-(--color-toast-text) shadow-(--shadow-toast) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-default) lg:w-auto lg:max-w-160 lg:rounded-capsule lg:pl-s24',
        leaving
          ? 'animate-[pop-out_var(--duration-pop)_var(--ease-standard)_forwards]'
          : 'animate-[pop-in_var(--duration-base)_var(--ease-standard)]',
      )}
    >
      {withIcon ? <Icon name="check" size="base" className="text-(--color-toast-accent)" /> : null}
      <Text slot="title" className="min-w-0 flex-1 text-list">
        {message}
      </Text>
      <Button
        slot="close"
        // The close slot names the button "Close"; the action is what it does, so it names it.
        aria-label={actionLabel}
        onPress={onAction}
        className="focus-ring h-ctl-touch shrink-0 cursor-pointer rounded-capsule px-s16 text-list font-emphasis text-(--color-toast-accent) transition-colors duration-(--duration-fast) data-[hovered]:bg-(--color-toast-text)/10 data-[pressed]:bg-(--color-toast-text)/10"
      >
        {actionLabel}
      </Button>
      <Button
        aria-label="Fechar aviso"
        onPress={dismiss}
        className="focus-ring grid size-ctl-touch shrink-0 cursor-pointer place-items-center rounded-capsule text-(--color-toast-text) transition-colors duration-(--duration-fast) data-[hovered]:bg-(--color-toast-text)/10 data-[pressed]:bg-(--color-toast-text)/10"
      >
        <Icon name="close" size="base" />
      </Button>
    </AriaToast>
  );
}
