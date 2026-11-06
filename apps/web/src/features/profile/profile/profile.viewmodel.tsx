import { useRouter } from '@tanstack/react-router';

import { HighlightsSection } from '#/features/profile/profile/components/highlights-section.component.tsx';
import { SpendMapSection } from '#/features/profile/profile/components/spend-map-section.component.tsx';
import { ProfileEditViewModel } from '#/features/profile/profile/profile-edit/profile-edit.viewmodel.tsx';
import { useProfileSearch } from '#/features/profile/profile/hooks/use-profile-search.hook.ts';
import { useProfileModel } from '#/features/profile/profile/profile.model.ts';
import { ProfileView } from '#/features/profile/profile/profile.view.tsx';
import { buildHeatmapDayHref } from '#/features/profile/profile/utils/build-heatmap-day-href.util.ts';
import { buildRecurrenceHref } from '#/features/profile/profile/utils/build-recurrence-href.util.ts';
import { summarizeHeatmap } from '#/features/profile/profile/utils/summarize-heatmap.util.ts';
import { buildHighlightItems } from '#/features/profile/profile/utils/build-highlight-items.util.tsx';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';

/**
 * Wires Perfil. The name is edited in a modal here; an income source is a recurrence, so adding
 * or editing one goes to the recurrence modal of Recorrências (one form, no copy), and a day of the
 * map (a month or a year, chosen on the map) opens that day's transactions.
 */
export function ProfileViewModel() {
  const { profile, spendPeriod, heatmap, highlights, categories } = useProfileModel();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { search, update } = useProfileSearch();
  const isEditing = search.edit === 'profile';

  const profileState = profile.isError ? 'error' : profile.data ? 'ready' : 'loading';
  const heatmapState = heatmap.isError ? 'error' : heatmap.data ? 'ready' : 'loading';
  const highlightsState = highlights.isError ? 'error' : highlights.data ? 'ready' : 'loading';
  const today = getBusinessDate(new Date());
  const categoryNames = new Map((categories.data?.items ?? []).map((item) => [item.id, item.name]));

  return (
    <ProfileView
      isDesktop={isDesktop}
      state={profileState}
      profile={profile.data}
      onRetry={() => void profile.refetch()}
      onEditProfile={() => update({ edit: 'profile' })}
      onAddSource={() => navigateToHref(router, buildRecurrenceHref())}
      onEditSource={(recurrenceId) => navigateToHref(router, buildRecurrenceHref(recurrenceId))}
      spendMap={
        <SpendMapSection
          state={heatmapState}
          period={spendPeriod.period}
          isCurrent={spendPeriod.isCurrent}
          isRefreshing={heatmap.isPlaceholderData}
          data={heatmap.data}
          summary={heatmap.data ? summarizeHeatmap(heatmap.data, today) : undefined}
          today={today}
          onModeChange={spendPeriod.setMode}
          onPrevious={spendPeriod.goToPrevious}
          onNext={spendPeriod.goToNext}
          onRetry={() => void heatmap.refetch()}
          onSelectDay={(date) => navigateToHref(router, buildHeatmapDayHref(date))}
        />
      }
      highlights={
        <HighlightsSection
          state={highlightsState}
          items={buildHighlightItems({
            highlights: highlights.data ?? null,
            categoryName: (categoryId) => categoryNames.get(categoryId),
            today,
          })}
          onRetry={() => void highlights.refetch()}
        />
      }
      editModal={
        isEditing && profile.data ? (
          <ProfileEditViewModel
            profile={profile.data}
            onClose={() => update({ edit: undefined })}
          />
        ) : null
      }
    />
  );
}
