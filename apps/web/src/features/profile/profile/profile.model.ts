import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useSpendHeatmap } from '#/domain/dashboard/spend-heatmap/hooks/use-spend-heatmap.hook.ts';
import { useProfileHighlights } from '#/domain/profile/highlights/hooks/use-profile-highlights.hook.ts';
import { useProfile } from '#/domain/profile/profile/hooks/use-profile.hook.ts';

/**
 * What the Perfil screen reads: the profile with its income, the 12-month spend map and the six
 * curiosities (with the categories, to name the one that spent the most).
 */
export function useProfileModel() {
  return {
    profile: useProfile(),
    heatmap: useSpendHeatmap(),
    highlights: useProfileHighlights(),
    categories: useCategories({ status: 'all' }),
  };
}
