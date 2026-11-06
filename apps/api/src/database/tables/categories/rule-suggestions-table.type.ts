export interface RuleSuggestionsTable {
  id: string;
  pattern: string;
  category_id: string;
  status: 'accepted' | 'dismissed';
  decided_at: string;
}
