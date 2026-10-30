import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { SpendMapSection } from '#/features/settings/settings/profile/components/spend-map-section.component.tsx';
import { ProfileEditViewModel } from '#/features/settings/settings/profile/profile-edit/profile-edit.viewmodel.tsx';
import { useProfileModel } from '#/features/settings/settings/profile/profile.model.ts';
import { ProfileView } from '#/features/settings/settings/profile/profile.view.tsx';
import { buildHeatmapDayHref } from '#/features/settings/settings/profile/utils/build-heatmap-day-href.util.ts';
import { buildRecurrenceHref } from '#/features/settings/settings/profile/utils/build-recurrence-href.util.ts';
import { summarizeHeatmap } from '#/features/settings/settings/profile/utils/summarize-heatmap.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';

/**
 * Wires "Perfil". The name is edited in a modal here; an income source is a recurrence, so adding
 * or editing one goes to the recurrence modal of Recorrências (one form, no copy), and a day of the
 * map opens that day's transactions.
 */
export function ProfileViewModel() {
  const { profile, heatmap } = useProfileModel();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const profileState = profile.isError ? 'error' : profile.data ? 'ready' : 'loading';
  const heatmapState = heatmap.isError ? 'error' : heatmap.data ? 'ready' : 'loading';

  return (
    <ProfileView
      state={profileState}
      profile={profile.data}
      onRetry={() => void profile.refetch()}
      onEditProfile={() => setIsEditing(true)}
      onAddSource={() => navigateToHref(router, buildRecurrenceHref())}
      onEditSource={(recurrenceId) => navigateToHref(router, buildRecurrenceHref(recurrenceId))}
      spendMap={
        <SpendMapSection
          state={heatmapState}
          data={heatmap.data}
          summary={heatmap.data ? summarizeHeatmap(heatmap.data) : undefined}
          onRetry={() => void heatmap.refetch()}
          onSelectDay={(date) => navigateToHref(router, buildHeatmapDayHref(date))}
        />
      }
      editModal={
        isEditing && profile.data ? (
          <ProfileEditViewModel profile={profile.data} onClose={() => setIsEditing(false)} />
        ) : null
      }
    />
  );
}
