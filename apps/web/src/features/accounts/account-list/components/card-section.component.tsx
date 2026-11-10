import { DashedAddBox, PagerArrows, PagerTrack, Section, usePagedScroll } from '@fincheck/ui';

import { CardBlock } from '#/features/accounts/account-list/components/card-block.component.tsx';
import { CARD_GRID_CLASS } from '#/features/accounts/account-list/constants/account-grid-class.constant.ts';
import { CARDS_PER_PAGE } from '#/features/accounts/account-list/constants/card-section.constant.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import type { CardBlockData } from '#/features/accounts/account-list/types/account-list.type.ts';

type CardSectionProps = {
  cards: readonly CardBlockData[];
  onAddCard: () => void;
  onViewInvoice: (cardId: string, month: string) => void;
  onCorrectInvoice: (cardId: string, month: string) => void;
  onOpenInstallments: (cardId: string) => void;
  onOpenFuture: (cardId: string) => void;
  onMenuAction: (cardId: string, key: string) => void;
};

/**
 * "Cartões de crédito": each card with its invoice panel as one block. One card has a dashed
 * "Adicionar cartão de crédito" box beside it (below it on the phone), the size of the block; two sit
 * side by side on the desktop with nothing else; from three the blocks page two at a time. On the
 * phone a page is one block, so from two cards they page one at a time, by finger or by the arrows
 * on the title line, which stay dimmed at the first and the last page.
 */
export function CardSection({
  cards,
  onAddCard,
  onViewInvoice,
  onCorrectInvoice,
  onOpenInstallments,
  onOpenFuture,
  onMenuAction,
}: CardSectionProps) {
  const pager = usePagedScroll();
  const isDesktop = useIsDesktop();
  // A page is two blocks on the desktop and one on the phone: the arrows come when there is more
  // than one page in the layout the person is in (two cards: no arrows on the desktop, arrows on the phone).
  const hasPager = cards.length > (isDesktop ? CARDS_PER_PAGE.desktop : CARDS_PER_PAGE.phone);

  const blocks = cards.map((card) => (
    <CardBlock
      key={card.id}
      data={card}
      onViewInvoice={onViewInvoice}
      onCorrectInvoice={onCorrectInvoice}
      onOpenInstallments={onOpenInstallments}
      onOpenFuture={onOpenFuture}
      onMenuAction={onMenuAction}
    />
  ));

  return (
    <Section
      title="Cartões de crédito"
      divider={false}
      action={
        hasPager ? (
          <PagerArrows
            previousLabel="Cartões anteriores"
            nextLabel="Próximos cartões"
            onPrevious={pager.goBack}
            onNext={pager.goForward}
            isPreviousDisabled={!pager.canGoBack}
            isNextDisabled={!pager.canGoForward}
          />
        ) : undefined
      }
    >
      {hasPager ? (
        <PagerTrack trackRef={pager.trackRef} label="Cartões de crédito">
          {blocks}
        </PagerTrack>
      ) : (
        <div className={CARD_GRID_CLASS}>
          {blocks}
          {cards.length === 1 ? (
            <DashedAddBox
              label="Adicionar cartão de crédito"
              onPress={onAddCard}
              className="lg:self-stretch"
            />
          ) : null}
        </div>
      )}
    </Section>
  );
}
