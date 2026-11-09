// Port to the category whose trend is asked: it must exist, and its kind says whether the bars are
// spending or income. Throws `CATEGORY_NOT_FOUND` (404) when it does not. The owner is
// `categories`.
export interface TrendCategoryReader {
  requireCategory(categoryId: string): Promise<{ id: string; kind: 'expense' | 'income' }>;
}
