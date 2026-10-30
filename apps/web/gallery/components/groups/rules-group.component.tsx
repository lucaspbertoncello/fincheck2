import {
  Chip,
  RuleEditor,
  RuleList,
  RulePhrase,
  RulePreview,
  RuleRow,
  RuleSentenceText,
  RuleSuggestionBanner,
  RuleToken,
  type RuleTokenKind,
  type RuleRowData,
} from '@fincheck/ui';

import { RULE_ROWS } from '#gallery/constants/sample-planning.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const noop = () => undefined;
const KINDS: RuleTokenKind[] = ['option', 'value', 'category', 'empty'];

const PREVIEW = {
  title: 'Bate com 14 transações do histórico',
  matches: [
    { id: 'm1', description: 'BURGER COLINA', dateLabel: '18/10', cents: 5490 },
    { id: 'm2', description: 'BURGER COLINA', dateLabel: '11/10', cents: 6290 },
    { id: 'm3', description: 'BURGER NORTE', dateLabel: '03/10', cents: 4890 },
  ],
  moreCount: 11,
};

const SENTENCE = (
  <>
    <RuleSentenceText>Sempre que a</RuleSentenceText>
    <RuleToken kind="option" trailing="dropdown" onPress={noop}>
      descrição contém
    </RuleToken>
    <RuleToken kind="value" trailing="edit" onPress={noop}>
      BURGER
    </RuleToken>
    <RuleSentenceText>, vai para</RuleSentenceText>
    <RuleToken kind="category" icon="delivery" trailing="dropdown" onPress={noop}>
      Delivery
    </RuleToken>
    <RuleSentenceText>com a tag</RuleSentenceText>
    <RuleToken kind="empty" icon="plus-circle" onPress={noop}>
      tag
    </RuleToken>
  </>
);

function RuleListDemo({ rules }: { rules: RuleRowData[] }) {
  return (
    <State initial={rules}>
      {(items, set) => (
        <RuleList
          rules={items}
          onActiveChange={(id, active) =>
            set(items.map((rule) => (rule.id === id ? { ...rule, active } : rule)))
          }
          onAction={noop}
          emptyMessage="Nenhuma regra ainda."
        />
      )}
    </State>
  );
}

export const RULES_SECTIONS: GallerySectionDef[] = [
  {
    id: 'rule-token',
    title: 'RuleToken, RuleSentenceText e RulePhrase',
    content: (
      <>
        {KINDS.map((kind) => (
          <GalleryVariant key={kind} caption={`${kind} (botão)`}>
            <RuleToken kind={kind} onPress={noop} trailing="dropdown">
              Delivery
            </RuleToken>
          </GalleryVariant>
        ))}
        <GalleryVariant caption="texto simples (sem onPress)">
          <RuleToken kind="value">UBER *TRIP</RuleToken>
        </GalleryVariant>
        <GalleryVariant caption="desabilitado">
          <RuleToken kind="option" isDisabled onPress={noop}>
            a descrição contém
          </RuleToken>
        </GalleryVariant>
        <GalleryVariant caption="RulePhrase" width={600}>
          <p className="text-list text-fg-primary">
            <RulePhrase segments={RULE_ROWS[1]!.phrase} />
          </p>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'rule-row',
    title: 'RuleRow e RuleList',
    content: (
      <>
        <GalleryVariant caption="RuleRow ativa" width={820}>
          <ul className="m-0 list-none p-0">
            <RuleRow rule={RULE_ROWS[0]!} onActiveChange={noop} onAction={noop} />
          </ul>
        </GalleryVariant>
        <GalleryVariant caption="RuleRow desligada (60%)" width={820}>
          <ul className="m-0 list-none p-0">
            <RuleRow rule={RULE_ROWS[1]!} onActiveChange={noop} onAction={noop} />
          </ul>
        </GalleryVariant>
        <GalleryVariant caption="RuleList" width={820}>
          <RuleListDemo rules={RULE_ROWS} />
        </GalleryVariant>
        <GalleryVariant caption="RuleList vazia" width={820}>
          <RuleListDemo rules={[]} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'rule-editor',
    title: 'RuleEditor e RulePreview',
    content: (
      <>
        <State initial={false}>
          {(apply, set) => (
            <GalleryVariant caption="nova regra, sugerida, com prévia" width={760}>
              <RuleEditor
                title="Nova regra"
                badge={<Chip tone="accent">Sugerida</Chip>}
                intro="Você moveu 3 transações “BURGER” para Delivery."
                sentence={SENTENCE}
                preview={PREVIEW}
                historyLabel="Aplicar também nessas 14 transações"
                historyHint="Recategoriza o histórico; edições feitas à mão não mudam."
                applyToHistory={apply}
                onApplyToHistoryChange={set}
                onSubmit={noop}
                onCancel={noop}
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="sem prévia, enviando" width={760}>
          <RuleEditor
            title="Editar regra"
            sentence={SENTENCE}
            onSubmit={noop}
            onCancel={noop}
            submitting
          />
        </GalleryVariant>
        <GalleryVariant caption="envio desabilitado" width={760}>
          <RuleEditor sentence={SENTENCE} onSubmit={noop} onCancel={noop} submitDisabled />
        </GalleryVariant>
        <GalleryVariant caption="RulePreview solto" width={560}>
          <RulePreview preview={PREVIEW} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'rule-suggestion',
    title: 'RuleSuggestionBanner',
    content: (
      <GalleryVariant caption="banner de sugestão" width={760}>
        <RuleSuggestionBanner
          message="Você moveu 3 transações “UBER *TRIP” para Transporte. A regra faz isso sozinha."
          onCreate={noop}
        />
      </GalleryVariant>
    ),
  },
];
