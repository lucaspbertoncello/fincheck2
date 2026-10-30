import type { CategoryFilterKey } from '@fincheck/ui';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useCategoryListModel } from '#/features/categories/category-list/category-list.model.ts';
import { categoryListSearchSchema } from '#/features/categories/category-list/schemas/category-list-search.schema.ts';
import { buildArchiveCategoryImpact } from '#/features/categories/category-list/utils/build-archive-category-impact.util.ts';
import type { CategoryFormTarget } from '#/features/categories/category-form/types/category-form.type.ts';
import { useScreenSearch } from '#/features/categories/hooks/use-screen-search.hook.ts';
import type { TagFormTarget } from '#/features/categories/tag-form/types/tag-form.type.ts';
import {
  countCategoriesByFilter,
  filterCategories,
} from '#/features/categories/utils/filter-categories.util.ts';
import { getBusinessToday } from '#/features/categories/utils/get-business-today.util.ts';
import { toManagedCategory } from '#/features/categories/utils/to-managed-category.util.ts';
import { toTagItem } from '#/features/categories/utils/to-tag-item.util.ts';

const EMPTY_MESSAGES: Record<CategoryFilterKey, string> = {
  expense: 'Nenhuma categoria de despesa ainda.',
  income: 'Nenhuma categoria de receita ainda.',
  archived: 'Nenhuma categoria arquivada.',
};

const LIST_LABELS: Record<CategoryFilterKey, string> = {
  expense: 'Categorias de despesa',
  income: 'Categorias de receita',
  archived: 'Categorias arquivadas',
};

/**
 * Wires the Categorias screen: the tab and the open modals live in the URL, the search, the
 * archive confirmation and the tag modal are local, and every move shows its undo toast.
 */
export function useCategoryListViewModel() {
  const model = useCategoryListModel();
  const toast = useToast();
  const { search, update } = useScreenSearch(categoryListSearchSchema);

  const [searchText, setSearchText] = useState('');
  const [showArchivedTags, setShowArchivedTags] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [tagTarget, setTagTarget] = useState<TagFormTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const allCategories = model.categories.data?.items ?? [];
  const allTags = model.tags.data?.items ?? [];
  const today = getBusinessToday();
  const filter = search.filter;

  const editing = search.edit ? allCategories.find((item) => item.id === search.edit) : undefined;
  const categoryTarget: CategoryFormTarget | null = search.new
    ? { mode: 'create', kind: filter === 'income' ? 'income' : 'expense' }
    : editing
      ? { mode: 'edit', category: editing }
      : null;

  const archiveTarget = allCategories.find((item) => item.id === archiveTargetId);
  const archivedTags = allTags.filter((tag) => tag.archivedAt !== null);
  const visibleTags = showArchivedTags ? allTags : allTags.filter((tag) => tag.archivedAt === null);

  async function moveCategory(
    id: string,
    name: string,
    direction: 'archive' | 'restore',
    afterMove?: () => void,
  ) {
    const mutation = direction === 'archive' ? model.archiveCategory : model.unarchiveCategory;
    const opposite = direction === 'archive' ? model.unarchiveCategory : model.archiveCategory;
    await mutation.mutateAsync(id);
    afterMove?.(); // the dialog goes first, so the toast is not hidden behind it
    toast.showUndoToast({
      message:
        direction === 'archive'
          ? `${name} arquivada. Sai da escolha de categoria.`
          : `${name} voltou para a escolha de categoria.`,
      onUndo: () => {
        opposite
          .mutateAsync(id)
          .catch(() => setActionError('Não deu para desfazer. Tente de novo.'));
      },
      withIcon: true,
    });
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiveError(null);
    try {
      await moveCategory(archiveTarget.id, archiveTarget.name, 'archive', () =>
        setArchiveTargetId(null),
      );
    } catch {
      setArchiveError('Não deu para arquivar agora. Tente de novo.');
    }
  }

  function restoreCategory(id: string) {
    const category = allCategories.find((item) => item.id === id);
    if (!category) return;
    setActionError(null);
    moveCategory(id, category.name, 'restore').catch(() =>
      setActionError(`Não deu para desarquivar ${category.name}. Tente de novo.`),
    );
  }

  function moveTag(id: string, name: string, direction: 'archive' | 'restore') {
    const mutation = direction === 'archive' ? model.archiveTag : model.unarchiveTag;
    const opposite = direction === 'archive' ? model.unarchiveTag : model.archiveTag;
    setActionError(null);
    mutation
      .mutateAsync(id)
      .then(() =>
        toast.showUndoToast({
          message:
            direction === 'archive'
              ? `Tag ${name} arquivada. Sai da escolha de tag.`
              : `Tag ${name} voltou para a escolha de tag.`,
          onUndo: () => {
            opposite
              .mutateAsync(id)
              .catch(() => setActionError('Não deu para desfazer. Tente de novo.'));
          },
          withIcon: true,
        }),
      )
      .catch(() => setActionError(`Não deu para mudar a tag ${name}. Tente de novo.`));
  }

  function withTag(id: string, run: (tag: (typeof allTags)[number]) => void) {
    const tag = allTags.find((item) => item.id === id);
    if (tag) run(tag);
  }

  return {
    isLoading: model.categories.isPending || model.tags.isPending,
    isError: model.categories.isError || model.tags.isError,
    onRetry: () => {
      void model.categories.refetch();
      void model.tags.refetch();
    },
    actionError,
    onDismissActionError: () => setActionError(null),

    filter,
    onFilterChange: (next: CategoryFilterKey) =>
      update({ filter: next === 'expense' ? undefined : next }),
    searchText,
    onSearchChange: setSearchText,
    counts: countCategoriesByFilter(allCategories),

    categories: filterCategories(allCategories, filter, searchText).map((category) =>
      toManagedCategory(category, today),
    ),
    listLabel: LIST_LABELS[filter],
    emptyMessage: searchText ? 'Nenhuma categoria com esse nome.' : EMPTY_MESSAGES[filter],
    showsArchivedNote: filter === 'archived',
    canCreate: filter !== 'archived',
    onCreateCategory: () => update({ new: 'category', edit: undefined }),
    onEditCategory: (id: string) => update({ edit: id, new: undefined }),
    onRequestArchive: (id: string) => {
      setArchiveError(null);
      setArchiveTargetId(id);
    },
    onRestoreCategory: restoreCategory,

    tags: visibleTags.map(toTagItem),
    activeTagCount: allTags.length - archivedTags.length,
    archivedTagCount: archivedTags.length,
    showArchivedTags,
    onToggleArchivedTags: () => setShowArchivedTags((shown) => !shown),
    onCreateTag: () => setTagTarget({ mode: 'create' }),
    onRenameTag: (id: string) => withTag(id, (tag) => setTagTarget({ mode: 'rename', tag })),
    onArchiveTag: (id: string) => withTag(id, (tag) => moveTag(id, tag.name, 'archive')),
    onRestoreTag: (id: string) => withTag(id, (tag) => moveTag(id, tag.name, 'restore')),

    categoryForm: {
      target: categoryTarget,
      onClose: () => update({ new: undefined, edit: undefined }),
    },
    tagForm: { target: tagTarget, onClose: () => setTagTarget(null) },
    archiveDialog: archiveTarget
      ? {
          title: `Arquivar ${archiveTarget.name}?`,
          description:
            archiveError ?? 'Arquivar só tira a categoria da escolha. Nada do histórico muda.',
          changes: buildArchiveCategoryImpact(archiveTarget),
          confirmLabel: archiveError ? 'Tentar de novo' : 'Arquivar',
          loading: model.archiveCategory.isPending,
          onConfirm: () => void confirmArchive(),
          onClose: () => setArchiveTargetId(null),
        }
      : null,
  };
}
