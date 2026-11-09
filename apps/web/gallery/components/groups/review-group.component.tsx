import { ReviewProgress, ReviewQueueCard, ReviewQueueList, ReviewStrip } from '@fincheck/ui';
import { useState } from 'react';

import {
  REVIEW_QUEUE,
  REVIEW_SUGGESTIONS,
  REVIEW_TRANSACTION,
} from '#gallery/constants/sample-planning.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';

const noop = () => undefined;
const SAMPLE_TAGS = [
  { id: 'almoco', name: 'almoço' },
  { id: 'trabalho', name: 'trabalho' },
];
const EMPTY_PICKER = {
  options: [],
  selected: [],
  onChange: noop,
  onCreate: (name: string) => Promise.resolve(name),
};

function QueueCardDemo({ withRule, canGoBack }: { withRule: boolean; canGoBack: boolean }) {
  const [selected, setSelected] = useState<string | null>('cat-food');
  const [tagIds, setTagIds] = useState<string[]>(['almoco']);
  const [enabled, setEnabled] = useState(true);
  return (
    <ReviewQueueCard
      transaction={REVIEW_TRANSACTION}
      suggestions={REVIEW_SUGGESTIONS}
      selectedCategoryId={selected}
      onSelectCategory={setSelected}
      onOtherCategory={noop}
      tagPicker={{
        categoryName: 'Restaurantes',
        options: SAMPLE_TAGS,
        selected: SAMPLE_TAGS.filter((tag) => tagIds.includes(tag.id)),
        onChange: setTagIds,
        onCreate: (name) => Promise.resolve(name),
      }}
      rule={
        withRule
          ? { keyword: 'MOCOTO', matchCount: 14, enabled, onEnabledChange: setEnabled }
          : undefined
      }
      canGoBack={canGoBack}
      onBack={noop}
      onSkip={noop}
      onSave={noop}
    />
  );
}

export const REVIEW_SECTIONS: GallerySectionDef[] = [
  {
    id: 'review-progress',
    title: 'ReviewProgress e ReviewStrip',
    content: (
      <>
        <GalleryVariant caption="3 de 12" width={420}>
          <ReviewProgress done={3} total={12} />
        </GalleryVariant>
        <GalleryVariant caption="começando (0 de 12)" width={420}>
          <ReviewProgress done={0} total={12} />
        </GalleryVariant>
        <GalleryVariant caption="completo" width={420}>
          <ReviewProgress done={12} total={12} />
        </GalleryVariant>
        <GalleryVariant caption="ReviewStrip 12" width={520}>
          <ReviewStrip count={12} onReview={noop} />
        </GalleryVariant>
        <GalleryVariant caption="ReviewStrip 1" width={520}>
          <ReviewStrip count={1} onReview={noop} />
        </GalleryVariant>
        <GalleryVariant caption="ReviewStrip 0 (não desenha)" width={520}>
          <ReviewStrip count={0} onReview={noop} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'review-queue-card',
    title: 'ReviewQueueCard',
    content: (
      <>
        <GalleryVariant caption="com regra, primeira da fila" width={640}>
          <QueueCardDemo withRule canGoBack={false} />
        </GalleryVariant>
        <GalleryVariant caption="sem regra, pode voltar" width={640}>
          <QueueCardDemo withRule={false} canGoBack />
        </GalleryVariant>
        <GalleryVariant caption="salvando, sem seleção" width={640}>
          <ReviewQueueCard
            transaction={{ ...REVIEW_TRANSACTION, name: 'PAG*ComercialVR', icon: 'tag' }}
            suggestions={REVIEW_SUGGESTIONS}
            selectedCategoryId={null}
            onSelectCategory={noop}
            onOtherCategory={noop}
            tagPicker={{ ...EMPTY_PICKER, categoryName: null }}
            canGoBack
            onBack={noop}
            onSkip={noop}
            onSave={noop}
            saving
          />
        </GalleryVariant>
        <GalleryVariant caption="receita" width={640}>
          <ReviewQueueCard
            transaction={{
              name: 'PIX RECEBIDO ANA M.',
              detail: 'Banco Aurora, Pix, 20/10',
              amountCents: 120000,
              kind: 'income',
              icon: 'salary',
            }}
            suggestions={[{ id: 'inc-1', label: 'Salário', icon: 'salary' }]}
            selectedCategoryId="inc-1"
            onSelectCategory={noop}
            onOtherCategory={noop}
            tagPicker={{ ...EMPTY_PICKER, categoryName: 'Salário' }}
            canGoBack
            onBack={noop}
            onSkip={noop}
            onSave={noop}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'review-queue-list',
    title: 'ReviewQueueList',
    content: (
      <>
        <GalleryVariant caption="normal e ambíguo" width={640}>
          <ReviewQueueList items={REVIEW_QUEUE} onChoose={noop} onChooseOther={noop} />
        </GalleryVariant>
        <GalleryVariant caption="vazia" width={640}>
          <ReviewQueueList items={[]} onChoose={noop} onChooseOther={noop} />
        </GalleryVariant>
      </>
    ),
  },
];
