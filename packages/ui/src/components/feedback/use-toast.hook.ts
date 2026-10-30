import { useContext } from 'react';

import { ToastContext } from '#/components/feedback/toast.context.ts';
import type { ToastApi } from '#/components/feedback/toast.type.ts';

/** Fires toasts: `const { showUndoToast } = useToast()`. Needs a `ToastProvider` above. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a ToastProvider above it.');
  return api;
}
