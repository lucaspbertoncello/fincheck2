import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useSpendHeatmapRange } from '#/domain/dashboard/spend-heatmap/hooks/use-spend-heatmap-range.hook.ts';
import { useProfileHighlights } from '#/domain/profile/highlights/hooks/use-profile-highlights.hook.ts';
import { useProfile } from '#/domain/profile/profile/hooks/use-profile.hook.ts';
import { useSpendMapPeriod } from '#/features/profile/profile/hooks/use-spend-map-period.hook.ts';
import { resolveSpendMapRange } from '#/features/profile/profile/utils/resolve-spend-map-range.util.ts';

/**
 * What the Perfil screen reads: the profile with its income, the spend map of the period chosen
 * (a month or a year) and the six curiosities (with the categories, to name the one that spent the
 * most).
 */
export function useProfileModel() {
  const spendPeriod = useSpendMapPeriod();
  const { from, to } = resolveSpendMapRange(spendPeriod.period);

  return {
    profile: useProfile(),
    spendPeriod,
    heatmap: useSpendHeatmapRange(from, to),
    highlights: useProfileHighlights(),
    categories: useCategories({ status: 'all' }),
  };
}
