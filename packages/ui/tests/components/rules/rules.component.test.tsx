import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  RuleEditor,
  RuleList,
  RuleSentenceText,
  RuleSuggestionBanner,
  RuleToken,
  type RuleRowData,
} from '#/components/rules/index.ts';

const noop = () => undefined;

const rules: RuleRowData[] = [
  {
    id: 'r1',
    name: 'Delivery',
    icon: 'delivery',
    active: true,
    appliedCount: 38,
    phrase: [
      'Sempre que a descrição contém ',
      { strong: 'PEDIDOZAP' },
      ', vai para ',
      { strong: 'Delivery' },
      '.',
    ],
  },
  {
    id: 'r2',
    name: 'VR',
    icon: 'cart',
    active: false,
    appliedCount: 1,
    phrase: [
      'Sempre que vier Pix do tio de ',
      { moneyCents: 77700 },
      ', vai para ',
      { strong: 'VR' },
    ],
  },
];

describe('RuleToken', () => {
  it('has a look for each kind', () => {
    expect(renderToStaticMarkup(<RuleToken kind="option">a descrição contém</RuleToken>)).toContain(
      'bg-subtle',
    );
    expect(renderToStaticMarkup(<RuleToken kind="value">UBERX</RuleToken>)).toContain(
      'tabular-nums',
    );
    expect(renderToStaticMarkup(<RuleToken kind="category">Transporte</RuleToken>)).toContain(
      'bg-brand-weak',
    );
    expect(renderToStaticMarkup(<RuleToken kind="empty">tag</RuleToken>)).toContain(
      'border-dashed',
    );
  });

  it('is a button with the 44 px target when it can be pressed, plain text otherwise', () => {
    const button = renderToStaticMarkup(
      <RuleToken onPress={noop} trailing="dropdown" ariaLabel="Categoria: Transporte">
        Transporte
      </RuleToken>,
    );
    const plain = renderToStaticMarkup(<RuleToken>Transporte</RuleToken>);

    expect(button).toContain('<button');
    expect(button).toContain('aria-label="Categoria: Transporte"');
    expect(button).toContain('h-ctl-touch');
    expect(plain).not.toContain('<button');
  });
});

describe('RuleEditor', () => {
  const sentence = (
    <>
      <RuleSentenceText>Sempre que</RuleSentenceText>
      <RuleToken kind="option" onPress={noop} trailing="dropdown">
        a descrição contém
      </RuleToken>
      <RuleToken kind="value" onPress={noop} trailing="edit">
        UBERX
      </RuleToken>
      <RuleSentenceText>categorizar como</RuleSentenceText>
      <RuleToken kind="category" icon="car" onPress={noop} trailing="dropdown">
        Transporte
      </RuleToken>
    </>
  );
  const preview = {
    title: 'Bate com 14 transações do histórico',
    matches: [
      { id: 'a', description: 'UBERX HELP', dateLabel: '18/10', cents: 3140 },
      { id: 'b', description: 'UBERX', dateLabel: '02/10', cents: 4690 },
    ],
    moreCount: 12,
  };

  it('writes the sentence, the preview with "e mais N" and the unchecked history option', () => {
    const html = renderToStaticMarkup(
      <RuleEditor
        badge={<span>Sugerida</span>}
        intro="Você moveu 3 transações."
        sentence={sentence}
        preview={preview}
        historyLabel="Aplicar também nessas 14 transações"
        historyHint="Recategoriza o histórico."
        applyToHistory={false}
        onApplyToHistoryChange={noop}
        onSubmit={noop}
        onCancel={noop}
      />,
    );

    expect(html).toContain('Nova regra');
    expect(html).toContain('Sugerida');
    expect(html).toContain('Sempre que');
    expect(html).toContain('Transporte');
    expect(html).toContain('Bate com 14 transações do histórico');
    expect(html).toContain('UBERX HELP');
    expect(html).toContain('31,40');
    expect(html).toContain('e mais 12');
    expect(html).toContain('Aplicar também nessas 14 transações');
    expect(html).not.toContain('checked');
    expect(html).toContain('Agora não');
    expect(html).toContain('Criar regra');
  });

  it('drops the preview and the history option without them', () => {
    const html = renderToStaticMarkup(
      <RuleEditor sentence={sentence} onSubmit={noop} onCancel={noop} title="Editar regra" />,
    );

    expect(html).toContain('Editar regra');
    expect(html).not.toContain('Bate com');
    expect(html).not.toContain('Aplicar também');
  });

  it('hides the preview amounts when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <RuleEditor sentence={sentence} preview={preview} onSubmit={noop} onCancel={noop} />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('31,40');
  });
});

describe('RuleList', () => {
  it('shows the title, the count and the sentences with the tokens in bold', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} onActiveChange={noop} onAction={noop} />,
    );

    expect(html).toContain('Regras ativas');
    expect(html).toContain('2 regras');
    expect(html).toContain('<strong class="font-emphasis">PEDIDOZAP</strong>');
    expect(html).toContain('Aplicada 38 vezes');
    expect(html).toContain('Aplicada 1 vez</button>');
  });

  it('writes amounts of the sentence through Money', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} onActiveChange={noop} onAction={noop} />,
    );

    expect(html).toContain('777,00');
    expect(html).toContain('R$');
  });

  it('fades the off rule and badges it as off; the on one has no fade', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} onActiveChange={noop} onAction={noop} />,
    );

    expect(html.match(/opacity-60/g)).toHaveLength(1);
    expect(html.match(/>Desativada</g)).toHaveLength(1);
    expect(html).toContain('aria-label="Regra ativa"');
    expect(html).toContain('aria-label="Regra desativada"');
  });

  it('is the standard row: icon, destination as the name, the sentence as the detail', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} onActiveChange={noop} onAction={noop} />,
    );

    expect(html).toContain('title="Delivery"');
    expect(html).toContain('title="VR"');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('lg:line-clamp-1');
    expect(html).toContain('title="Sempre que a descrição contém PEDIDOZAP, vai para Delivery."');
    // the sentence with an amount has no title: it would leak what the eye hides
    expect(html).not.toContain('title="Sempre que vier Pix do tio');
  });

  it('puts the switch at the right end, then the "…" menu, and "Aplicada" on the strip', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={rules} onActiveChange={noop} onAction={noop} />,
    );

    expect(html.match(/role="switch"/g)).toHaveLength(2);
    expect(html.match(/aria-label="Ações da regra"/g)).toHaveLength(2);
    expect(html.indexOf('role="switch"')).toBeLessThan(html.indexOf('aria-label="Ações da regra"'));
    expect(html.match(/col-start-1 row-start-3/g)).toHaveLength(2);
    expect(html).not.toContain('>Ativa<');
  });

  it('shows the empty message with no rules', () => {
    const html = renderToStaticMarkup(
      <RuleList rules={[]} onActiveChange={noop} onAction={noop} />,
    );

    expect(html).toContain('Nenhuma regra ainda.');
    expect(html).toContain('0 regras');
  });

  it('hides the sentence amounts when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <RuleList rules={rules} onActiveChange={noop} onAction={noop} />
      </MoneyVisibilityContext>,
    );

    expect(html).not.toContain('777,00');
    expect(html).toContain('••••');
  });
});

describe('RuleSuggestionBanner', () => {
  it('writes the message and the "Criar regra" button on the weak accent box', () => {
    const html = renderToStaticMarkup(
      <RuleSuggestionBanner
        message="Você moveu 3 transações “UBERX” para Transporte."
        onCreate={noop}
      />,
    );

    expect(html).toContain('Você moveu 3 transações');
    expect(html).toContain('Criar regra');
    expect(html).toContain('bg-brand-weak');
  });
});
