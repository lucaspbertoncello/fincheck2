import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Button, FineNote, Money, Section } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { IncomeSourceRow } from '#/features/settings/settings/profile/components/income-source-row.component.tsx';
import { ProfileAvatar } from '#/features/settings/settings/profile/components/profile-avatar.component.tsx';

type ProfileViewProps = {
  state: 'loading' | 'error' | 'ready';
  profile?: Profile.Dto;
  onRetry: () => void;
  onEditProfile: () => void;
  onAddSource: () => void;
  onEditSource: (recurrenceId: string) => void;
  /** The 12-month spend map section, below. */
  spendMap: ReactNode;
  /** The edit modal, when open. */
  editModal: ReactNode;
};

/**
 * "Perfil": who the app calls the user, the income (every source IS an income recurrence, with the
 * expected monthly income on top) and the 12-month spend map.
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
    <div className="flex flex-col gap-s16 lg:gap-s24">
      <Section title="Perfil" variant="glass">
        {state === 'loading' ? <SectionSkeleton label="Carregando o perfil" /> : null}
        {state === 'error' ? (
          <SectionError message="Não deu para carregar o perfil." onRetry={onRetry} />
        ) : null}
        {state === 'ready' && profile ? (
          <>
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

            <section
              aria-labelledby="profile-income-title"
              className="flex flex-col gap-s16 border-t border-line pt-s24"
            >
              <div className="flex items-end justify-between gap-s16 max-lg:flex-wrap">
                <div className="flex flex-col gap-s4">
                  <h3
                    id="profile-income-title"
                    className="text-label font-emphasis text-fg-secondary"
                  >
                    Empregos e renda
                  </h3>
                  <p className="flex items-baseline gap-s8 text-money-lg text-fg-primary lg:text-money-card">
                    <Money cents={profile.income.monthlyExpectedCents} sign="none" tone="income" />
                    <span className="text-meta text-fg-secondary">de renda mensal esperada</span>
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon="salary" onPress={onAddSource}>
                  Adicionar fonte
                </Button>
              </div>
              {profile.income.sources.length === 0 ? (
                <FineNote icon="salary">
                  Nenhuma fonte de renda ainda. Cadastre seu salário ou outra receita fixa: ela vira
                  uma recorrência e entra na renda mensal.
                </FineNote>
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
            </section>
          </>
        ) : null}
      </Section>
      {spendMap}
      {editModal}
    </div>
  );
}
