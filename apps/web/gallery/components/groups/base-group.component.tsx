import {
  Button,
  CardDot,
  Chip,
  ChoiceChip,
  CountBadge,
  HideValuesButton,
  Logo,
  Money,
  OverflowMenu,
  PlusButton,
  PlusMenu,
  Section,
  VariationBadge,
  type ButtonSize,
  type ButtonVariant,
  type ChipTone,
  type OverflowMenuItem,
  type PlusMenuItem,
} from '@fincheck/ui';

import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'tertiary'];
const SIZES: ButtonSize[] = ['md', 'sm'];
const TONES: ChipTone[] = ['neutral', 'warn', 'accent', 'ok', 'dashed', 'tag'];
const noop = () => undefined;

const PLUS_ITEMS: PlusMenuItem[] = [
  { key: 'tx', label: 'Nova transação', description: 'Lançar à mão', icon: 'plus-circle' },
  { key: 'rec', label: 'Nova recorrência', icon: 'repeat' },
  { key: 'rule', label: 'Nova regra', icon: 'magic', separatorBefore: true },
];

const OVERFLOW_ITEMS: OverflowMenuItem[] = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'split', label: 'Dividir', icon: 'split', isDisabled: true },
  { key: 'delete', label: 'Excluir', icon: 'trash', danger: true, separatorBefore: true },
];

function ButtonMatrix() {
  return (
    <>
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <GalleryVariant key={`${variant}-${size}`} caption={`${variant} · ${size}`}>
            <div className="flex flex-wrap items-center gap-s8">
              <Button variant={variant} size={size} onPress={noop}>
                Salvar
              </Button>
              <Button variant={variant} size={size} icon="plus-circle" onPress={noop}>
                Com ícone
              </Button>
              <Button variant={variant} size={size} danger onPress={noop}>
                Excluir
              </Button>
              <Button variant={variant} size={size} isDisabled onPress={noop}>
                Desabilitado
              </Button>
              <Button
                variant={variant}
                size={size}
                loading
                loadingLabel="Salvando..."
                onPress={noop}
              >
                Salvar
              </Button>
              <Button
                variant={variant}
                size={size}
                iconOnly
                icon="edit"
                label="Editar"
                onPress={noop}
              />
            </div>
          </GalleryVariant>
        )),
      )}
      <GalleryVariant caption="fullWidth (modal no celular)" width={320}>
        <Button fullWidth onPress={noop}>
          Confirmar
        </Button>
      </GalleryVariant>
    </>
  );
}

export const BASE_SECTIONS: GallerySectionDef[] = [
  {
    id: 'logo',
    title: 'Logo e CardDot',
    content: (
      <>
        <GalleryVariant caption="Logo" width={240}>
          <Logo className="h-8 w-auto" />
        </GalleryVariant>
        <GalleryVariant caption="Logo grande" width={400}>
          <Logo className="h-14 w-auto" />
        </GalleryVariant>
        <GalleryVariant caption="CardDot">
          <CardDot />
        </GalleryVariant>
      </>
    ),
  },
  { id: 'button', title: 'Button', content: <ButtonMatrix /> },
  {
    id: 'chip',
    title: 'Chip',
    content: (
      <>
        {TONES.map((tone) => (
          <GalleryVariant key={tone} caption={tone}>
            <Chip tone={tone}>Editada</Chip>
          </GalleryVariant>
        ))}
        <GalleryVariant caption="large">
          <Chip tone="warn" large>
            Atrasado
          </Chip>
        </GalleryVariant>
        <GalleryVariant caption="com ícone">
          <Chip tone="ok" icon="check">
            Confirmado
          </Chip>
        </GalleryVariant>
        <GalleryVariant caption="tag">
          <Chip tone="tag"># delivery</Chip>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'choice-chip',
    title: 'ChoiceChip',
    content: (
      <>
        <State initial={false}>
          {(selected, set) => (
            <GalleryVariant caption="normal (clique alterna)">
              <ChoiceChip selected={selected} onChange={set}>
                Restaurantes
              </ChoiceChip>
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="selecionado">
          <ChoiceChip selected onChange={noop}>
            Delivery
          </ChoiceChip>
        </GalleryVariant>
        <GalleryVariant caption="ghost">
          <ChoiceChip selected={false} ghost icon="plus-circle" onChange={noop}>
            Escolher outra
          </ChoiceChip>
        </GalleryVariant>
        <GalleryVariant caption="com ícone">
          <ChoiceChip selected icon="food" onChange={noop}>
            Restaurantes
          </ChoiceChip>
        </GalleryVariant>
        <GalleryVariant caption="desabilitado">
          <ChoiceChip selected={false} isDisabled onChange={noop}>
            Indisponível
          </ChoiceChip>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'count-badge',
    title: 'CountBadge e VariationBadge',
    content: (
      <>
        <GalleryVariant caption="CountBadge 3">
          <CountBadge count={3} />
        </GalleryVariant>
        <GalleryVariant caption="CountBadge 128">
          <CountBadge count={128} />
        </GalleryVariant>
        <GalleryVariant caption="+9,9% (cinza, abaixo de 10)">
          <VariationBadge percent={9.9} />
        </GalleryVariant>
        <GalleryVariant caption="+12% despesa (vermelho)">
          <VariationBadge percent={12} />
        </GalleryVariant>
        <GalleryVariant caption="+108% caution">
          <VariationBadge percent={108} badTone="caution" />
        </GalleryVariant>
        <GalleryVariant caption="-12% despesa (verde)">
          <VariationBadge percent={-12} />
        </GalleryVariant>
        <GalleryVariant caption="+14% receita (verde)">
          <VariationBadge percent={14} risingIsGood />
        </GalleryVariant>
        <GalleryVariant caption="-20% receita (vermelho)">
          <VariationBadge percent={-20} risingIsGood />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'money',
    title: 'Money',
    content: (
      <>
        <GalleryVariant caption="auto, positivo">
          <Money cents={123456} />
        </GalleryVariant>
        <GalleryVariant caption="auto, negativo">
          <Money cents={-123456} />
        </GalleryVariant>
        <GalleryVariant caption="sign=plus, tone=income">
          <Money cents={420000} sign="plus" tone="income" />
        </GalleryVariant>
        <GalleryVariant caption="sign=minus">
          <Money cents={8790} sign="minus" />
        </GalleryVariant>
        <GalleryVariant caption="sign=none">
          <Money cents={-8790} sign="none" />
        </GalleryVariant>
        <GalleryVariant caption="tone=faded">
          <Money cents={-8790} tone="faded" />
        </GalleryVariant>
        <GalleryVariant caption="weight light / plain / emphasis">
          <div className="flex flex-col gap-s4">
            <Money cents={98765} weight="light" />
            <Money cents={98765} weight="plain" />
            <Money cents={98765} weight="emphasis" />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="showCents=false">
          <Money cents={58500} showCents={false} />
        </GalleryVariant>
        <GalleryVariant caption="hero (text-hero, fixed, smallDots)">
          <Money cents={585000} currency="fixed" smallDots className="text-hero" />
        </GalleryVariant>
        <GalleryVariant caption="signColumn em lista">
          <div className="flex w-48 flex-col items-end gap-s4">
            <Money cents={420000} sign="plus" signColumn tone="income" />
            <Money cents={-8790} signColumn />
            <Money cents={-123456} signColumn />
          </div>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'hide-values-button',
    title: 'HideValuesButton',
    content: (
      <>
        <State initial={false}>
          {(hidden, set) => (
            <GalleryVariant caption="interativo (local, não muda o botão da barra)">
              <HideValuesButton isHidden={hidden} onToggle={() => set(!hidden)} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="valores à mostra">
          <HideValuesButton isHidden={false} onToggle={noop} />
        </GalleryVariant>
        <GalleryVariant caption="valores ocultos">
          <HideValuesButton isHidden onToggle={noop} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'plus',
    title: 'PlusButton e PlusMenu',
    content: (
      <>
        <GalleryVariant caption="PlusButton">
          <PlusButton label="Nova transação" onPress={noop} />
        </GalleryVariant>
        <GalleryVariant caption="PlusMenu (abre ao clicar)">
          <PlusMenu label="Criar" items={PLUS_ITEMS} onAction={noop} />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'overflow-menu',
    title: 'OverflowMenu',
    content: (
      <GalleryVariant caption="com divisor, item desabilitado e item perigoso">
        <OverflowMenu label="Ações da transação" items={OVERFLOW_ITEMS} onAction={noop} />
      </GalleryVariant>
    ),
  },
  {
    id: 'section',
    title: 'Section',
    content: (
      <>
        <GalleryVariant caption="open (com divisor)" width={420}>
          <Section
            title="Até o fim do mês"
            action={
              <Button variant="tertiary" size="sm" onPress={noop}>
                A pagar e receber
              </Button>
            }
          >
            <p className="text-body text-fg-secondary">Conteúdo da seção aberta.</p>
          </Section>
        </GalleryVariant>
        <GalleryVariant caption="open sem divisor" width={420}>
          <Section title="Primeira da coluna" divider={false}>
            <p className="text-body text-fg-secondary">Sem a linha de cima.</p>
          </Section>
        </GalleryVariant>
        <GalleryVariant caption="glass" width={420}>
          <Section title="Painel de ações" variant="glass">
            <p className="text-body text-fg-secondary">Cartão com caixa.</p>
          </Section>
        </GalleryVariant>
      </>
    ),
  },
];
