import {
  Checkbox,
  FineNote,
  MoneyField,
  OkLine,
  SearchField,
  SegmentedControl,
  Switch,
  TextField,
  formatCentsInput,
  parseCentsInput,
  type SegmentedOption,
} from '@fincheck/ui';

import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

const noop = () => undefined;

const TYPE_OPTIONS: SegmentedOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'expense', label: 'Despesas' },
  { key: 'income', label: 'Receitas' },
];

const VIEW_OPTIONS: SegmentedOption[] = [
  { key: 'list', label: 'Lista', icon: 'list' },
  { key: 'category', label: 'Por categoria', icon: 'folder' },
];

export const FORMS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'text-field',
    title: 'TextField',
    content: (
      <>
        <State initial="Mocoto Restaurante">
          {(value, set) => (
            <GalleryVariant caption="preenchido" width={320}>
              <TextField label="Descrição" value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="vazio com placeholder" width={320}>
          <TextField label="Descrição" value="" onChange={noop} placeholder="Ex.: Almoço" />
        </GalleryVariant>
        <GalleryVariant caption="com descrição" width={320}>
          <TextField
            label="Apelido do cartão"
            value="Roxinho"
            onChange={noop}
            description="Aparece na lista de cartões."
          />
        </GalleryVariant>
        <GalleryVariant caption="com erro" width={320}>
          <TextField label="Descrição" value="" onChange={noop} error="Informe uma descrição." />
        </GalleryVariant>
        <GalleryVariant caption="obrigatório" width={320}>
          <TextField label="Nome da categoria" value="Mercado" onChange={noop} isRequired />
        </GalleryVariant>
        <GalleryVariant caption="desabilitado" width={320}>
          <TextField label="Banco" value="Banco Aurora" onChange={noop} isDisabled />
        </GalleryVariant>
        <GalleryVariant caption="senha" width={320}>
          <TextField label="Senha" value="segredo123" onChange={noop} type="password" />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'money-field',
    title: 'MoneyField',
    content: (
      <>
        <State initial={8790}>
          {(cents, set) => (
            <GalleryVariant caption="field (digite: 1, 12, 123)" width={320}>
              <MoneyField label="Valor" cents={cents} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="field zerado" width={320}>
          <MoneyField label="Valor" cents={0} onChange={noop} />
        </GalleryVariant>
        <GalleryVariant caption="field com erro" width={320}>
          <MoneyField
            label="Valor"
            cents={0}
            onChange={noop}
            error="Informe um valor maior que zero."
          />
        </GalleryVariant>
        <GalleryVariant caption="field desabilitado" width={320}>
          <MoneyField label="Valor" cents={12345} onChange={noop} isDisabled />
        </GalleryVariant>
        <State initial={123456}>
          {(cents, set) => (
            <GalleryVariant caption="large" width={320}>
              <MoneyField label="Quanto?" cents={cents} onChange={set} size="large" />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="utilitários">
          <p className="text-meta text-fg-secondary">
            formatCentsInput(123456) = {formatCentsInput(123456)}
            <br />
            parseCentsInput(&quot;12,34&quot;) = {parseCentsInput('12,34')}
          </p>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'search-field',
    title: 'SearchField',
    content: (
      <>
        <State initial="">
          {(value, set) => (
            <GalleryVariant caption="vazio (digite para ver o limpar)" width={360}>
              <SearchField label="Buscar transações" value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="com texto" width={360}>
          <SearchField label="Buscar transações" value="mercado" onChange={noop} />
        </GalleryVariant>
        <GalleryVariant caption="desabilitado" width={360}>
          <SearchField label="Buscar transações" value="" onChange={noop} isDisabled />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'segmented-control',
    title: 'SegmentedControl',
    content: (
      <>
        <State initial="all">
          {(value, set) => (
            <GalleryVariant caption="texto" width={360}>
              <SegmentedControl
                label="Tipo de transação"
                options={TYPE_OPTIONS}
                value={value}
                onChange={set}
              />
            </GalleryVariant>
          )}
        </State>
        <State initial="list">
          {(value, set) => (
            <GalleryVariant caption="com ícone" width={360}>
              <SegmentedControl label="Visão" options={VIEW_OPTIONS} value={value} onChange={set} />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="desabilitado" width={360}>
          <SegmentedControl
            label="Tipo"
            options={TYPE_OPTIONS}
            value="expense"
            onChange={noop}
            isDisabled
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'switch',
    title: 'Switch',
    content: (
      <>
        <State initial={true}>
          {(on, set) => (
            <GalleryVariant caption="ligado, com rótulo">
              <Switch isSelected={on} onChange={set} label="Regra ativa" />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="desligado">
          <Switch isSelected={false} onChange={noop} label="Regra ativa" />
        </GalleryVariant>
        <GalleryVariant caption="só ariaLabel">
          <Switch isSelected ariaLabel="Regra ativa" onChange={noop} />
        </GalleryVariant>
        <GalleryVariant caption="desabilitado ligado / desligado">
          <div className="flex gap-s16">
            <Switch isSelected isDisabled onChange={noop} label="Ligado" />
            <Switch isSelected={false} isDisabled onChange={noop} label="Desligado" />
          </div>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    content: (
      <>
        <State initial={false}>
          {(on, set) => (
            <GalleryVariant caption="interativo">
              <Checkbox isSelected={on} onChange={set}>
                Aplicar ao histórico
              </Checkbox>
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="marcado">
          <Checkbox isSelected onChange={noop}>
            Marcado
          </Checkbox>
        </GalleryVariant>
        <GalleryVariant caption="indeterminado">
          <Checkbox isSelected={false} isIndeterminate onChange={noop}>
            Algumas
          </Checkbox>
        </GalleryVariant>
        <GalleryVariant caption="só ariaLabel">
          <Checkbox isSelected={false} ariaLabel="Selecionar linha" onChange={noop} />
        </GalleryVariant>
        <GalleryVariant caption="desabilitado">
          <div className="flex gap-s16">
            <Checkbox isSelected={false} isDisabled onChange={noop}>
              Vazio
            </Checkbox>
            <Checkbox isSelected isDisabled onChange={noop}>
              Marcado
            </Checkbox>
          </div>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'notes',
    title: 'FineNote e OkLine',
    content: (
      <>
        <GalleryVariant caption="FineNote" width={360}>
          <FineNote icon="lock">Seus dados ficam só neste computador.</FineNote>
        </GalleryVariant>
        <GalleryVariant caption="OkLine" width={360}>
          <OkLine>Soma confere</OkLine>
        </GalleryVariant>
      </>
    ),
  },
];
