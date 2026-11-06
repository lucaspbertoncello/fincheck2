import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { IconName } from '@fincheck/ui';

// How an account or card the bank brings is named and drawn in its card, one per type.
export const CONNECTION_ACCOUNT_KIND: Record<
  Connection.Account['type'],
  { label: string; icon: IconName }
> = {
  checking: { label: 'Conta corrente', icon: 'wallet' },
  savings: { label: 'Poupança', icon: 'coins' },
  credit_card: { label: 'Cartão de crédito', icon: 'card' },
};
