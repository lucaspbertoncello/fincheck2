import { useSpendHeatmap } from '#/domain/dashboard/spend-heatmap/hooks/use-spend-heatmap.hook.ts';
import { useProfile } from '#/domain/profile/profile/hooks/use-profile.hook.ts';

/** What the "Perfil" section reads: the profile with its income, and the 12-month spend map. */
export function useProfileModel() {
  return { profile: useProfile(), heatmap: useSpendHeatmap() };
}
