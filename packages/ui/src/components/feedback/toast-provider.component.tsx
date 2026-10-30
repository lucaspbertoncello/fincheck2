import { type ReactNode, useState } from 'react';
import { UNSTABLE_ToastQueue as ToastQueue, UNSTABLE_ToastRegion } from 'react-aria-components';

import { ToastContext } from '#/components/feedback/toast.context.ts';
import type { ToastApi, UndoToastContent } from '#/components/feedback/toast.type.ts';
import { UndoToast } from '#/components/feedback/undo-toast.component.tsx';

const DEFAULT_TIMEOUT_MS = 6000;
const MAX_VISIBLE_TOASTS = 3;

type ToastProviderProps = {
  children: ReactNode;
};

function createToastService() {
  const queue = new ToastQueue<UndoToastContent>({ maxVisibleToasts: MAX_VISIBLE_TOASTS });
  const api: ToastApi = {
    showUndoToast: ({ message, onUndo, actionLabel = 'Desfazer', withIcon = false, timeout }) =>
      queue.add(
        { message, actionLabel, onAction: onUndo, withIcon },
        { timeout: timeout ?? DEFAULT_TIMEOUT_MS },
      ),
    closeToast: (key) => queue.close(key),
  };
  return { queue, api };
}

/**
 * Region and queue of the undo toasts (components.md 13.1). Mount it once at the app root; the queue
 * belongs to the provider, not to a module-level store. The region is an `aria-live` landmark
 * (F6 reaches it), toasts pause their timer on hover and focus, and up to 3 show at once.
 * Sticky 24 from the bottom, centered; on the phone 16 above the bottom navigation.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [{ queue, api }] = useState(createToastService);

  return (
    <ToastContext value={api}>
      {children}
      <UNSTABLE_ToastRegion
        queue={queue}
        aria-label="Avisos"
        className="pointer-events-none fixed inset-x-s16 bottom-s16 z-(--z-undo-toast) flex flex-col items-center gap-s8 pb-bottom-nav lg:bottom-s24 lg:pb-0"
      >
        {({ toast }) => <UndoToast toast={toast} />}
      </UNSTABLE_ToastRegion>
    </ToastContext>
  );
}
