import {
  BottomNav,
  Button,
  CardDot,
  ConnectionErrorNotice,
  ContentSkeleton,
  DateLine,
  EmptyState,
  FreeBalancePanel,
  Logo,
  MonthPicker,
  PageHeader,
  PlusButton,
  RemainingLine,
  SegmentedNav,
  SettingsLink,
  Skeleton,
  SyncErrorBanner,
  TopBar,
  MoneyVisibilityContext,
  useMediaQuery,
  type ContentSkeletonVariant,
} from '@fincheck/ui';
import type { ReactNode } from 'react';

import { NAV_ITEMS } from '#gallery/constants/sample-planning.constant.ts';
import { FREE_BALANCE, FREE_BALANCE_LONG } from '#gallery/constants/sample-summary.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const noop = () => undefined;
const SKELETONS: ContentSkeletonVariant[] = ['overview', 'list', 'cards', 'sections'];

const SEGMENTS = [
  { key: 'recurrences', label: 'Recorrências', href: '#recurrences' },
  { key: 'bills', label: 'A pagar e receber', href: '#bills' },
];

/** `transform` makes a `position: fixed` child (the bottom bar) fix itself to this frame. */
function Frame({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-input border border-line"
      style={{ height, transform: 'translateZ(0)' }}
    >
      {children}
    </div>
  );
}

function MediaQueryProbe() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  return (
    <p className="text-body text-fg-primary">
      (min-width: 1024px): <strong>{String(desktop)}</strong>
    </p>
  );
}

export const SHELL_SECTIONS: GallerySectionDef[] = [
  {
    id: 'top-bar',
    title: 'TopBar e SettingsLink',
    content: (
      <>
        <GalleryVariant caption="TopBar do celular (no desktop, o trilho lateral)" width={420}>
          <TopBar
            logo={<Logo className="h-7 w-auto" />}
            actions={
              <>
                <SettingsLink href="#settings" label="Configurações" active={false} />
                <PlusButton label="Nova transação" onPress={noop} />
              </>
            }
          />
        </GalleryVariant>
        <GalleryVariant caption="SettingsLink inativo / ativo">
          <div className="flex gap-s8">
            <SettingsLink href="#settings" label="Configurações" active={false} />
            <SettingsLink href="#settings" label="Configurações" active />
          </div>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'bottom-nav',
    title: 'BottomNav',
    content: (
      <GalleryVariant
        caption="fixada à moldura; só aparece abaixo de 1024 px (use a janela estreita)"
        width={420}
      >
        <Frame height={120}>
          <BottomNav items={NAV_ITEMS} activeKey="accounts" label="Principal" />
        </Frame>
      </GalleryVariant>
    ),
  },
  {
    id: 'segmented-nav',
    title: 'SegmentedNav',
    content: (
      <>
        <GalleryVariant caption="primeiro ativo" width={420}>
          <SegmentedNav items={SEGMENTS} activeKey="recurrences" label="Recorrências" />
        </GalleryVariant>
        <GalleryVariant caption="segundo ativo" width={420}>
          <SegmentedNav items={SEGMENTS} activeKey="bills" label="Recorrências" />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'page-header',
    title: 'PageHeader, DateLine, MonthPicker e RemainingLine',
    content: (
      <>
        <GalleryVariant caption="PageHeader com seletor de mês" width={900}>
          <PageHeader
            title="Transações"
            date={<DateLine icon="sun" text="Quinta-feira, 22 de outubro" />}
            actions={
              <MonthPicker monthLabel="Outubro" yearLabel="2026" onPrevious={noop} onNext={noop} />
            }
          />
        </GalleryVariant>
        <GalleryVariant caption="PageHeader com linha extra" width={900}>
          <PageHeader
            title="Visão geral"
            date={<DateLine icon="sunrise" text="Quinta-feira, 22 de outubro" />}
            extra={
              <RemainingLine data={{ daysLeft: 10, incomeCents: 462500, expenseCents: 418714 }} />
            }
          />
        </GalleryVariant>
        <GalleryVariant caption="DateLine: manhã, tarde, fim de tarde, noite">
          <div className="flex flex-col gap-s8">
            <DateLine icon="sunrise" text="Quinta-feira, 22 de outubro" />
            <DateLine icon="sun" text="Quinta-feira, 22 de outubro" />
            <DateLine icon="sunset" text="Quinta-feira, 22 de outubro" />
            <DateLine icon="moon" text="Quinta-feira, 22 de outubro" />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="RemainingLine sem dado (skeleton)" width={600}>
          <RemainingLine />
        </GalleryVariant>
        <GalleryVariant caption="RemainingLine, valores altos (quebra de linha)" width={320}>
          <RemainingLine data={{ daysLeft: 1, incomeCents: 12345600, expenseCents: 98765400 }} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'empty-state',
    title: 'EmptyState',
    content: (
      <>
        <GalleryVariant caption="com duas ações" width={460}>
          <EmptyState
            icon="inbox"
            title="Nenhuma transação em outubro ainda"
            description="Conecte uma conta ou lance à mão."
            primaryAction={{ label: 'Conectar contas', onPress: noop, icon: 'plug' }}
            secondaryAction={{ label: 'Lançar transação', onPress: noop }}
          />
        </GalleryVariant>
        <GalleryVariant caption="só título" width={460}>
          <EmptyState icon="check" title="Tudo revisado" />
        </GalleryVariant>
        <GalleryVariant caption="título longo, h3" width={320}>
          <EmptyState
            icon="repeat"
            headingLevel={3}
            title="Nenhuma recorrência cadastrada neste mês ainda"
            description="Cadastre contas fixas para ver o que vem por aí."
            primaryAction={{ label: 'Nova recorrência', onPress: noop }}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'skeletons',
    title: 'Skeleton e ContentSkeleton',
    content: (
      <>
        <GalleryVariant caption="Skeleton" width={240}>
          <div className="flex flex-col gap-s8">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="size-ctl-tab" />
          </div>
        </GalleryVariant>
        {SKELETONS.map((variant) => (
          <GalleryVariant key={variant} caption={`ContentSkeleton ${variant}`} width={760}>
            <ContentSkeleton variant={variant} />
          </GalleryVariant>
        ))}
        <GalleryVariant
          caption="ContentSkeleton overview com 1 cartão de resumo (summaryCards={1})"
          width={760}
        >
          <ContentSkeleton variant="overview" summaryCards={1} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'sync-errors',
    title: 'SyncErrorBanner e ConnectionErrorNotice',
    content: (
      <>
        <GalleryVariant caption="SyncErrorBanner" width={680}>
          <SyncErrorBanner
            institution="Rio Azul"
            detail="Login com erro. Tentativas às 18:40 e 19:10."
            onRetry={noop}
          />
        </GalleryVariant>
        <GalleryVariant caption="tentando de novo, rótulo próprio" width={680}>
          <SyncErrorBanner
            institution="Rio Azul"
            actionLabel="Tentar de novo"
            onRetry={noop}
            retrying
          />
        </GalleryVariant>
        <GalleryVariant caption="ConnectionErrorNotice com motivo" width={420}>
          <ConnectionErrorNotice reason="login com erro" href="https://example.com/meu-pluggy" />
        </GalleryVariant>
        <GalleryVariant caption="sem motivo" width={420}>
          <ConnectionErrorNotice href="https://example.com/meu-pluggy" />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'free-balance-panel',
    title: 'FreeBalancePanel',
    content: (
      <State initial={false}>
        {(hidden, set) => (
          <MoneyVisibilityContext.Provider value={hidden}>
            <GalleryVariant caption="full (o olho daqui é local ao painel)" width={460}>
              <FreeBalancePanel
                data={FREE_BALANCE}
                isHidden={hidden}
                onToggleHidden={() => set(!hidden)}
              />
            </GalleryVariant>
            <GalleryVariant caption="full, dados mais longos (cabe em 100dvh - 32 px)" width={344}>
              <FreeBalancePanel
                data={FREE_BALANCE_LONG}
                isHidden={hidden}
                onToggleHidden={() => set(!hidden)}
              />
            </GalleryVariant>
            <GalleryVariant caption="compact" width={360}>
              <FreeBalancePanel
                data={FREE_BALANCE}
                variant="compact"
                isHidden={hidden}
                onToggleHidden={() => set(!hidden)}
              />
            </GalleryVariant>
            <GalleryVariant caption="sem dado (skeleton)" width={460}>
              <FreeBalancePanel isHidden={hidden} onToggleHidden={() => set(!hidden)} />
            </GalleryVariant>
          </MoneyVisibilityContext.Provider>
        )}
      </State>
    ),
  },
  {
    id: 'use-media-query',
    title: 'useMediaQuery',
    content: (
      <>
        <GalleryVariant caption="muda ao redimensionar a janela">
          <MediaQueryProbe />
        </GalleryVariant>
        <GalleryVariant caption="CardDot e Logo no cabeçalho">
          <div className="flex items-center gap-s12">
            <CardDot />
            <Button variant="tertiary" size="sm" onPress={noop}>
              Exemplo
            </Button>
          </div>
        </GalleryVariant>
      </>
    ),
  },
];
