import {
  Button,
  CategoryFilter,
  CategoryList,
  SegmentedControl,
  SettingRow,
  SettingsNav,
  Steps,
  Switch,
  TagChip,
  TagList,
  type CategoryFilterKey,
} from '@fincheck/ui';

import {
  MANAGED_CATEGORIES,
  SETTINGS_NAV,
  STEPS,
  TAGS,
} from '../../constants/sample-summary.constant.ts';
import type { GallerySectionDef } from '../../types/gallery-group.type.ts';
import { GalleryVariant } from '../shell/gallery-variant.component.tsx';
import { State } from '../shell/state.component.tsx';

const noop = () => undefined;

const THEME_OPTIONS = [
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
  { key: 'system', label: 'Sistema' },
];

export const SETTINGS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'settings-nav',
    title: 'SettingsNav',
    content: (
      <>
        <GalleryVariant caption="item ativo: Backup" width={340}>
          <SettingsNav items={SETTINGS_NAV} activeKey="backup" label="Seções de Configurações" />
        </GalleryVariant>
        <GalleryVariant caption="item ativo: Conexões" width={340}>
          <SettingsNav
            items={SETTINGS_NAV}
            activeKey="connections"
            label="Seções de Configurações"
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'setting-row',
    title: 'SettingRow',
    content: (
      <>
        <State initial={true}>
          {(on, set) => (
            <GalleryVariant caption="com Switch" width={620}>
              <SettingRow
                label="Sincronizar automaticamente"
                description="Busca transações novas a cada 6 horas."
                control={
                  <Switch isSelected={on} onChange={set} ariaLabel="Sincronizar automaticamente" />
                }
              />
            </GalleryVariant>
          )}
        </State>
        <State initial="light">
          {(value, set) => (
            <GalleryVariant caption="com SegmentedControl (stackOnPhone)" width={620}>
              <SettingRow
                label="Tema"
                description="Claro, escuro ou do sistema."
                stackOnPhone
                control={
                  <SegmentedControl
                    label="Tema"
                    options={THEME_OPTIONS}
                    value={value}
                    onChange={set}
                  />
                }
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="com botão perigoso, sem descrição" width={620}>
          <SettingRow
            label="Desconectar Banco Aurora"
            control={
              <Button variant="secondary" danger size="sm" onPress={noop}>
                Desconectar
              </Button>
            }
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'steps',
    title: 'Steps',
    content: (
      <GalleryVariant caption="concluído, atual, a fazer" width={460}>
        <Steps items={STEPS} label="Passos para conectar o Open Finance" />
      </GalleryVariant>
    ),
  },
  {
    id: 'category-filter',
    title: 'CategoryFilter',
    content: (
      <State<{ search: string; filter: CategoryFilterKey }>
        initial={{ search: '', filter: 'expense' }}
      >
        {(state, set) => (
          <GalleryVariant caption="busca + filtro com contagens" width={760}>
            <CategoryFilter
              search={state.search}
              onSearchChange={(search) => set({ ...state, search })}
              filter={state.filter}
              onFilterChange={(filter) => set({ ...state, filter })}
              counts={{ expense: 12, income: 5, archived: 2 }}
            />
          </GalleryVariant>
        )}
      </State>
    ),
  },
  {
    id: 'category-list',
    title: 'CategoryList',
    content: (
      <>
        <GalleryVariant caption="ativas, arquivada e Nova categoria" width={900}>
          <CategoryList
            categories={MANAGED_CATEGORIES}
            label="Categorias de despesa"
            onEdit={noop}
            onArchive={noop}
            onRestore={noop}
            onCreate={noop}
            createLabel="Nova categoria"
          />
        </GalleryVariant>
        <GalleryVariant caption="vazia" width={900}>
          <CategoryList
            categories={[]}
            label="Categorias de despesa"
            onEdit={noop}
            onArchive={noop}
            onRestore={noop}
            emptyMessage="Nenhuma categoria com esse nome."
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'tags',
    title: 'TagChip e TagList',
    content: (
      <>
        <GalleryVariant caption="TagChip ativa">
          <TagChip tag={TAGS[0]!} onRename={noop} onArchive={noop} onRestore={noop} />
        </GalleryVariant>
        <GalleryVariant caption="TagChip arquivada">
          <TagChip tag={TAGS[2]!} onRename={noop} onArchive={noop} onRestore={noop} />
        </GalleryVariant>
        <GalleryVariant caption="TagList com Nova tag" width={620}>
          <TagList
            tags={TAGS}
            label="Tags"
            onRename={noop}
            onArchive={noop}
            onRestore={noop}
            onCreate={noop}
            createLabel="Nova tag"
          />
        </GalleryVariant>
      </>
    ),
  },
];
