import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  type ToastProps as AriaToastProps,
} from 'react-aria-components';

import type { UndoToastContent } from '#/components/feedback/toast.type.ts';
import { Icon } from '#/components/icons/icon.component.tsx';

type UndoToastProps = {
  toast: AriaToastProps<UndoToastContent>['toast'];
};

/**
 * One undo toast (components.md 13.1): dark pill, 52 tall, message at 15 and the action at 44.
 * Phone: full width, radius 16. The action runs `onAction` and then closes the toast (the `close`
 * slot). Lives inside `ToastProvider`'s region, which is the `aria-live` area.
 */
export function UndoToast({ toast }: UndoToastProps) {
  const { message, actionLabel, onAction, withIcon } = toast.content;

  return (
    <AriaToast
      toast={toast}
      className="pointer-events-auto flex min-h-13 w-full origin-bottom animate-[pop-in_var(--duration-base)_var(--ease-standard)] items-center gap-s12 rounded-panel bg-(--color-toast-bg) py-s8 pr-s8 pl-s16 text-(--color-toast-text) shadow-(--shadow-toast) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-default) lg:w-auto lg:max-w-160 lg:rounded-capsule lg:pl-s24"
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
    </AriaToast>
  );
}
