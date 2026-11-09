import type { Generated } from 'kysely';

export interface CategoriesTable {
  id: string;
  kind: 'expense' | 'income';
  name: string;
  icon: string;
  is_default: 0 | 1;
  // 1 only for a category that is a transfer between own accounts ("Rotação entre contas"): a
  // transaction that takes it is a `transfer`, outside spending and income. The default is 0.
  is_transfer: Generated<0 | 1>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
