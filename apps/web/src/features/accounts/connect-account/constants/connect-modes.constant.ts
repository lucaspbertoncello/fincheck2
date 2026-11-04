import type { IconName } from '@fincheck/ui';

import type { ConnectMode } from '#/features/accounts/connect-account/types/connect-account.type.ts';

/** The first choice says the result, not the technique; descriptions fit one line of a card. */
export const CONNECT_MODE_OPTIONS: readonly {
  value: ConnectMode;
  label: string;
  icon: IconName;
  description: string;
}[] = [
  {
    value: 'open-finance',
    label: 'Banco (Open Finance)',
    icon: 'plug',
    description: 'Traz contas e cartões sozinho',
  },
  {
    value: 'manual',
    label: 'Conta manual',
    icon: 'edit',
    description: 'Carteira ou banco sem Open Finance',
  },
];

/** Where the person connects the bank and finds the connection code (the link, not a phrase). */
export const OPEN_FINANCE_SITE_URL = 'https://meu.pluggy.ai';

/** Length of the connection code the API accepts. */
export const CONNECTION_CODE_LENGTH = 36;
