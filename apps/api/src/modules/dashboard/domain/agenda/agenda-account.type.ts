import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

// An account as the Livre needs it: the balance and what kind it is.
export type AgendaAccount = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet' | 'credit_card';
  source: 'pluggy' | 'manual';
  institutionCode: Institution.Code;
  // Null while a bank account has no balance from the bank yet.
  balanceCents: number | null;
  isArchived: boolean;
};
