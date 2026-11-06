export interface CategoriesTable {
  id: string;
  kind: 'expense' | 'income';
  name: string;
  icon: string;
  is_default: 0 | 1;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
