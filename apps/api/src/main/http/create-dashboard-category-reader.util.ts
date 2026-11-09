import type { TrendCategoryReader } from '#/modules/dashboard/application/category/trend-category-reader.interface.ts';
import type { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';

// The reader of the category of a trend `dashboard` declares, over the query of `categories` that
// throws `CATEGORY_NOT_FOUND` for an id that does not exist.
export function createDashboardCategoryReader(
  categoryRefs: GetCategoryRefsQuery,
): TrendCategoryReader {
  return {
    async requireCategory(categoryId) {
      const category = (await categoryRefs.requireCategories([categoryId])).get(categoryId);
      if (!category) throw new RangeError(`The category ${categoryId} was not returned`);

      return { id: category.id, kind: category.kind };
    },
  };
}
