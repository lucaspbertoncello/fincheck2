import { createContext } from 'react';

import type { ToastApi } from '#/components/feedback/toast.type.ts';

/** The app mounts one `ToastProvider`; without it `useToast` throws. */
export const ToastContext = createContext<ToastApi | null>(null);
