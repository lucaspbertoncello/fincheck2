import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Button, EmptyState, ErrorState, Money, PageHeader, Section } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { IncomeSourceRow } from '#/features/profile/profile/components/income-source-row.component.tsx';
import { ProfileAvatar } from '#/features/profile/profile/components/profile-avatar.component.tsx';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';

const DESCRIPTION = 'Sua renda, seus gastos e algumas curiosidades.';

type ProfileViewProps = {
  /** True from 1024 px: the balance panel is in the shell column; on the phone it comes under the header. */
  isDesktop: boolean;
  state: 'loading' | 'error' | 'ready';
  profile?: Profile.Dto;
  onRetry: () => void;
  onEditProfile: () => void;
  onAddSource: () => void;
  onEditSource: (recurrenceId: string) => void;
  /** The 12-month spend map group, below. */
  spendMap: ReactNode;
  /** The six curiosities group, at the end. */
  highlights: ReactNode;
  /** The edit modal, when open. */
  editModal: ReactNode;
};

/**
 * Perfil, a screen of its own (BR-PRF-004), in the layout of the others: the title with one line of
 * description, the balance panel beside it (under the header on the phone) and the groups, in this
 * order (Lucas, polish 10): Você (who the app calls the user) in the head, then the 12-month
 * spend map, the six curiosities and Empregos e renda (every source IS an income recurrence, with
 * the expected monthly income on top). Loading and error keep the header, so the page does not jump when the data arrives.
 */
export function ProfileView({
  isDesktop,
  state,
  profile,
  onRetry,
  onEditProfile,
  onAddSource,
  onEditSource,
  spendMap,
  highlights,
  editModal,
}: ProfileViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-s16 lg:gap-s24">
      <PageHeader
        title="Perfil"
        date={<p className="text-meta text-fg-secondary lg:text-label">{DESCRIPTION}</p>}
      />
      {isDesktop ? null : <ApplicationSummaryPanel variant="compact" />}
      {state === 'loading' ? (
        <Section title="Você" divider={false}>
          <SectionSkeleton label="Carregando o perfil" rows={1} />
        </Section>
      ) : null}
      {state === 'error' ? (
        <ErrorState
          title="Não deu para carregar o perfil."
          description="Confira se o app está rodando e tente de novo."
          onRetry={onRetry}
        />
      ) : null}
      {state === 'ready' && profile ? (
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
      ) : null}
      {spendMap}
      {highlights}
      {state === 'loading' ? (
        <Section title="Empregos e renda">
          <SectionSkeleton label="Carregando a renda" rows={3} />
        </Section>
      ) : null}
      {state === 'ready' && profile ? (
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
      ) : null}
      {editModal}
    </div>
  );
}
