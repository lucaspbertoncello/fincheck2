import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Button, EmptyState, ErrorState, Money, Section } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { SettingsPageFrame } from '#/features/settings/settings/components/settings-page-frame.component.tsx';
import { SETTINGS_SECTION } from '#/features/settings/settings/constants/settings-sections.constant.ts';
import { IncomeSourceRow } from '#/features/settings/settings/profile/components/income-source-row.component.tsx';
import { ProfileAvatar } from '#/features/settings/settings/profile/components/profile-avatar.component.tsx';

const PAGE = SETTINGS_SECTION.profile;

type ProfileViewProps = {
  state: 'loading' | 'error' | 'ready';
  profile?: Profile.Dto;
  onRetry: () => void;
  onEditProfile: () => void;
  onAddSource: () => void;
  onEditSource: (recurrenceId: string) => void;
  /** The 12-month spend map group, below. */
  spendMap: ReactNode;
  /** The edit modal, when open. */
  editModal: ReactNode;
};

/**
 * "Perfil": three groups. Você (who the app calls the user), Empregos e renda (every source IS an
 * income recurrence, with the expected monthly income on top) and the 12-month spend map. Loading
 * and error keep the header, so the page does not jump when the data arrives.
 */
export function ProfileView({
  state,
  profile,
  onRetry,
  onEditProfile,
  onAddSource,
  onEditSource,
  spendMap,
  editModal,
}: ProfileViewProps) {
  return (
    <SettingsPageFrame title={PAGE.title} description={PAGE.description}>
      {state === 'loading' ? (
        <>
          <Section title="Você" divider={false}>
            <SectionSkeleton label="Carregando o perfil" rows={1} />
          </Section>
          <Section title="Empregos e renda">
            <SectionSkeleton label="Carregando a renda" rows={3} />
          </Section>
        </>
      ) : null}
      {state === 'error' ? (
        <ErrorState
          title="Não deu para carregar o perfil."
          description="Confira se o app está rodando e tente de novo."
          onRetry={onRetry}
        />
      ) : null}
      {state === 'ready' && profile ? (
        <>
          <Section title="Você" divider={false}>
            <div className="flex items-center gap-s16">
              <ProfileAvatar initials={profile.initials} />
              <div className="flex min-w-0 flex-1 flex-col gap-s4">
                <p className="truncate font-title text-page-title leading-(--line-height-title) font-heading text-fg-primary">
                  {profile.name}
                </p>
                <p className="text-meta text-fg-secondary">Como você aparece no app.</p>
              </div>
              <Button variant="secondary" size="sm" icon="edit" onPress={onEditProfile}>
                Editar
              </Button>
            </div>
          </Section>

          <Section
            title="Empregos e renda"
            action={
              <Button variant="secondary" size="sm" icon="salary" onPress={onAddSource}>
                Adicionar fonte
              </Button>
            }
          >
            <p className="flex flex-wrap items-baseline gap-x-s8 text-money-lg text-fg-primary lg:text-money-card">
              <Money cents={profile.income.monthlyExpectedCents} sign="none" tone="income" />
              <span className="text-meta text-fg-secondary">de renda mensal esperada</span>
            </p>
            {profile.income.sources.length === 0 ? (
              <EmptyState
                icon="salary"
                title="Nenhuma fonte de renda ainda"
                description="Cadastre seu salário ou outra receita fixa: ela vira uma recorrência e entra na renda mensal."
                headingLevel={3}
                primaryAction={{ label: 'Adicionar fonte', icon: 'salary', onPress: onAddSource }}
              />
            ) : (
              <ul className="flex flex-col">
                {profile.income.sources.map((source) => (
                  <IncomeSourceRow
                    key={source.recurrenceId}
                    source={source}
                    onEdit={() => onEditSource(source.recurrenceId)}
                  />
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
      {spendMap}
      {editModal}
    </SettingsPageFrame>
  );
}
