import { useId, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';

import { FIELD_BOX_CLASS, FIELD_LABEL_CLASS } from '#/components/forms/field-classes.constant.ts';
import { Icon } from '#/components/icons/index.ts';
import { buildTagRows } from '#/components/transactions/tags/build-tag-rows.util.ts';
import { moveActiveRow } from '#/components/transactions/tags/move-active-row.util.ts';
import type {
  TagPickerOption,
  TagPickerRow,
} from '#/components/transactions/tags/tag-picker-row.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const MAX_TAG_NAME_LENGTH = 30;

export type TagPickerProps = {
  /** Visible label ("Tags"). */
  label: string;
  /** Name of the category of the transaction; null while it has none. */
  categoryName: string | null;
  /** The tags of that category the person may mark (the active ones). */
  options: readonly TagPickerOption[];
  /** What to say while there is no category (default: asks for the category of the transaction). */
  noCategoryMessage?: string;
  /** The marked tags, for the chips (an archived tag the transaction already has still shows). */
  selected: readonly TagPickerOption[];
  /** The new set of marked ids. */
  onChange: (tagIds: string[]) => void;
  /** Creates a tag with the typed name in the category and gives its id. Rejects with the reason. */
  onCreate: (name: string) => Promise<string>;
  /** Reading the tags of the category. */
  status?: 'ready' | 'loading' | 'error';
  onRetry?: () => void;
  className?: string;
};

/**
 * Tags of a transaction (components.md 15): the tags of ITS category, always listed, so nothing has
 * to be typed to find one. A search field filters them; each line marks or unmarks a tag, and when
 * the text matches no name the last line says `Criar tag "texto" em Categoria`, which creates it
 * and marks it. Arrows move, Enter chooses, Esc clears the text. With no category it asks for one
 * first. A tag never lives outside a category.
 */
export function TagPicker({
  label,
  categoryName,
  noCategoryMessage,
  options,
  selected,
  onChange,
  onCreate,
  status = 'ready',
  onRetry,
  className,
}: TagPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedIds = selected.map((tag) => tag.id);
  const rows = buildTagRows(options, selectedIds, query);
  const activeRow =
    active >= 0 && active < rows.length ? active : rows.length > 0 && query ? 0 : -1;
  const rowId = (index: number) => `${listId}-row-${String(index)}`;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function create(name: string) {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await onCreate(name);
      onChange([...selectedIds, id]);
      setQuery('');
      setActive(-1);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Não deu para criar a tag.');
    } finally {
      setCreating(false);
    }
  }

  function choose(row: TagPickerRow | undefined) {
    if (!row) return;
    if (row.kind === 'tag') toggle(row.id);
    else void create(row.name);
  }

  const chips =
    selected.length > 0 ? (
      <ul aria-label="Tags marcadas" className="flex flex-wrap gap-s8">
        {selected.map((tag) => (
          <li
            key={tag.id}
            className="inline-flex items-center gap-s4 rounded-capsule border border-line pl-s12 text-label whitespace-nowrap text-fg-secondary"
          >
            <Icon name="hash" size="xs" />
            {tag.name}
            <AriaButton
              aria-label={`Remover a tag ${tag.name}`}
              onPress={() => toggle(tag.id)}
              className="focus-ring relative grid size-ctl-sm cursor-pointer place-items-center rounded-capsule text-fg-secondary before:absolute before:-inset-y-s8 before:inset-x-0 before:content-[''] data-[hovered]:text-fg-primary"
            >
              <Icon name="close" size="xs" />
            </AriaButton>
          </li>
        ))}
      </ul>
    ) : null;

  if (categoryName === null) {
    return (
      <div className={cx('flex flex-col gap-s8', className)}>
        <span className={FIELD_LABEL_CLASS}>{label}</span>
        <p className="text-label text-fg-secondary">
          {noCategoryMessage ??
            'Escolha a categoria da transação antes de usar tags: cada tag pertence a uma categoria.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cx('flex flex-col gap-s8', className)}>
      <div className="flex items-baseline justify-between gap-s8">
        <span className={FIELD_LABEL_CLASS}>{label}</span>
        <span className="truncate text-meta text-fg-secondary">em {categoryName}</span>
      </div>
      {chips}
      {status === 'loading' ? (
        <p role="status" className="text-label text-fg-secondary">
          Carregando as tags de {categoryName}...
        </p>
      ) : status === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center gap-s8 text-label text-alert">
          <span>Não deu para carregar as tags.</span>
          {onRetry ? (
            <AriaButton
              onPress={onRetry}
              className="focus-ring cursor-pointer rounded-capsule px-s8 font-emphasis text-brand"
            >
              Tentar de novo
            </AriaButton>
          ) : null}
        </div>
      ) : (
        <>
          <div className={cx(FIELD_BOX_CLASS, 'flex items-center gap-s8')}>
            <Icon name="search" size="base" className="shrink-0 text-fg-tertiary" />
            <input
              role="combobox"
              aria-label={`Buscar ou criar tag em ${categoryName}`}
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeRow >= 0 ? rowId(activeRow) : undefined}
              aria-autocomplete="list"
              value={query}
              maxLength={MAX_TAG_NAME_LENGTH}
              autoComplete="off"
              enterKeyHint="done"
              placeholder={options.length > 0 ? 'Buscar ou criar tag' : 'Nome da primeira tag'}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
                setCreateError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive(
                    moveActiveRow(activeRow, event.key === 'ArrowDown' ? 1 : -1, rows.length),
                  );
                } else if (event.key === 'Enter') {
                  // Never submits the form behind the modal: Enter only picks a line.
                  event.preventDefault();
                  choose(rows[activeRow]);
                } else if (event.key === 'Escape' && query !== '') {
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery('');
                  setActive(-1);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-tertiary"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label={`Tags de ${categoryName}`}
            aria-multiselectable="true"
            className="flex max-h-56 flex-col overflow-auto rounded-input border border-line p-s4"
          >
            {rows.length === 0 ? (
              <li role="presentation" className="px-s12 py-s12 text-label text-fg-secondary">
                {options.length === 0
                  ? `Nenhuma tag em ${categoryName} ainda. Digite um nome para criar a primeira.`
                  : 'Nenhuma tag assim.'}
              </li>
            ) : null}
            {rows.map((row, index) => (
              <li
                key={row.kind === 'tag' ? row.id : 'create'}
                id={rowId(index)}
                role="option"
                aria-selected={row.kind === 'tag' ? row.selected : false}
                aria-disabled={creating && row.kind === 'create' ? true : undefined}
                // Keeps the focus on the field, so the keyboard goes on working after a click.
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(row)}
                className={cx(
                  'flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s12 text-list outline-none lg:min-h-ctl-sm',
                  index === activeRow && 'bg-subtle',
                  row.kind === 'tag' && row.selected
                    ? 'font-emphasis text-brand'
                    : row.kind === 'create'
                      ? 'font-emphasis text-brand'
                      : 'text-fg-primary',
                )}
              >
                {row.kind === 'create' ? (
                  <>
                    <Icon name="plus-circle" size="sm" />
                    <span className="min-w-0 flex-1 truncate">
                      {creating ? 'Criando...' : `Criar tag "${row.name}" em ${categoryName}`}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon name="hash" size="sm" className="text-fg-secondary" />
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    <Icon name="check" size="sm" className={row.selected ? '' : 'invisible'} />
                  </>
                )}
              </li>
            ))}
          </ul>
          {createError ? (
            <p role="alert" className="text-meta text-alert">
              {createError}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
