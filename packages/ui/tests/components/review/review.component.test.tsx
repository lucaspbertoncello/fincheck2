import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  ReviewProgress,
  ReviewQueueCard,
  ReviewQueueList,
  ReviewStrip,
  type ReviewQueueItemData,
} from '#/components/review/index.ts';

const noop = () => {};

function card(overrides: Partial<Parameters<typeof ReviewQueueCard>[0]> = {}) {
  return renderToStaticMarkup(
    <ReviewQueueCard
      transaction={{
        name: 'MOCOTO RESTAURANTE',
        detail: 'Bradesco, crédito, 19/10',
        amountCents: -14200,
        kind: 'expense',
        icon: 'food',
      }}
      suggestions={[
        { id: 'food', label: 'Restaurantes', icon: 'food' },
        { id: 'fun', label: 'Lazer', icon: 'fun' },
      ]}
      selectedCategoryId="food"
      onSelectCategory={noop}
      onOtherCategory={noop}
      tags={['delivery']}
      onTagsChange={noop}
      canGoBack
      onBack={noop}
      onSkip={noop}
      onSave={noop}
      {...overrides}
    />,
  );
}

describe('ReviewQueueCard', () => {
  it('writes the bank description, detail, amount, suggestions, tags and the three actions', () => {
    const html = card();

    expect(html).toContain('MOCOTO RESTAURANTE');
    expect(html).toContain('Bradesco, crédito, 19/10');
    expect(html).toContain('142,00');
    expect(html).toContain('Restaurantes');
    expect(html).toContain('Outra');
    expect(html).toContain('delivery');
    expect(html).toContain('Voltar à anterior');
    expect(html).toContain('Pular');
    expect(html).toContain('Salvar e ir para a próxima');
  });

  it('marks the selected suggestion', () => {
    expect(card()).toContain('aria-pressed="true"');
  });

  it('writes the rule sentence and how many transactions it catches', () => {
    const html = card({
      rule: { keyword: 'MOCOTO', matchCount: 3, enabled: true, onEnabledChange: noop },
    });

    expect(html).toContain('Sempre que a descrição tiver');
    expect(html).toContain('MOCOTO');
    expect(html).toContain('Pega mais 3 transações do histórico.');
    expect(html).toContain('Edições à mão não mudam.');
  });

  it('has no rule block without a rule', () => {
    expect(card()).not.toContain('Sempre que a descrição');
  });

  it('keeps "Salvar" off until a category is chosen and "Voltar" off on the first one', () => {
    const html = card({ selectedCategoryId: null, canGoBack: false });

    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('hides the amount when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        {card() ? (
          <ReviewQueueCard
            transaction={{
              name: 'MOCOTO',
              detail: 'Bradesco',
              amountCents: -14200,
              kind: 'expense',
              icon: 'food',
            }}
            suggestions={[]}
            selectedCategoryId={null}
            onSelectCategory={noop}
            onOtherCategory={noop}
            tags={[]}
            onTagsChange={noop}
            canGoBack={false}
            onBack={noop}
            onSkip={noop}
            onSave={noop}
          />
        ) : null}
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('142,00');
  });
});

describe('ReviewProgress', () => {
  it('is a progress bar with "3 de 12 revisadas"', () => {
    const html = renderToStaticMarkup(<ReviewProgress done={3} total={12} />);

    expect(html).toContain('3 de 12 revisadas');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemax="12"');
    expect(html).toContain('width:25%');
  });

  it('does not divide by zero', () => {
    expect(renderToStaticMarkup(<ReviewProgress done={0} total={0} />)).toContain('width:0%');
  });
});

const queue: ReviewQueueItemData[] = [
  {
    id: 'q1',
    name: 'Pix do pai',
    detail: 'Nubank, Pix, 21/10',
    amountCents: 60000,
    kind: 'income',
    icon: 'dollar',
    ambiguity: {
      message: 'Mesada ou VR? O valor não bate com nenhum',
      options: [
        { id: 'allowance', label: 'Mesada', icon: 'dollar' },
        { id: 'meal', label: 'VR', icon: 'card' },
      ],
      otherLabel: 'Outra receita',
    },
  },
  {
    id: 'q2',
    name: 'PAG*ZONASUL 1032',
    detail: 'Bradesco, débito, 21/10',
    amountCents: -6418,
    kind: 'expense',
    icon: 'cart',
  },
];

describe('ReviewQueueList', () => {
  it('lists the next transactions with the review chip', () => {
    const html = renderToStaticMarkup(
      <ReviewQueueList items={queue} onChoose={noop} onChooseOther={noop} />,
    );

    expect(html).toContain('PAG*ZONASUL 1032');
    expect(html).toContain('64,18');
    expect(html).toContain('Para revisar');
  });

  it('settles the ambiguous case with its own buttons', () => {
    const html = renderToStaticMarkup(
      <ReviewQueueList items={queue} onChoose={noop} onChooseOther={noop} />,
    );

    expect(html).toContain('Mesada ou VR? O valor não bate com nenhum');
    expect(html).toContain('Mesada');
    expect(html).toContain('VR');
    expect(html).toContain('Outra receita');
    expect(html).toContain('+');
  });
});

describe('ReviewStrip', () => {
  it('writes the count and the "Revisar" button', () => {
    const html = renderToStaticMarkup(<ReviewStrip count={12} onReview={noop} />);

    expect(html).toContain('>12<');
    expect(html).toContain('para revisar');
    expect(html).toContain('Revisar');
    expect(html).toContain('bg-brand-weak');
  });

  it('is not drawn with nothing to review', () => {
    expect(renderToStaticMarkup(<ReviewStrip count={0} onReview={noop} />)).toBe('');
  });
});
