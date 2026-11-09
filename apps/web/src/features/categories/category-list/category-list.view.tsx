import {
  Banner,
  BannerSlot,
  Button,
  CategoryFilter,
  CategoryList,
  Collapse,
  ConfirmDialog,
  ContentSkeleton,
  CountBadge,
  Section,
  TagList,
} from '@fincheck/ui';

import { CategoryForm } from '#/features/categories/category-form/category-form.component.tsx';
import type { useCategoryListViewModel } from '#/features/categories/category-list/category-list.viewmodel.tsx';
import { TagForm } from '#/features/categories/tag-form/tag-form.component.tsx';

type CategoryListViewProps = ReturnType<typeof useCategoryListViewModel>;

/**
 * Categorias › Categorias (screens.md): the filter and the search, the management list (the name
 * opens the category page, "Editar" is in the menu), and the tags as the last filter. No amounts on this screen. Every state is here: skeleton,
 * error with retry, the empty lists and the list itself.
 */
export function CategoryListView({
  isLoading,
  isError,
  onRetry,
  actionError,
  onDismissActionError,
  filter,
  onFilterChange,
  searchText,
  onSearchChange,
  counts,
  categories,
  listLabel,
  emptyMessage,
  showsArchivedNote,
  showsTags,
  onOpenCategory,
  onEditCategory,
  onRequestArchive,
  onRestoreCategory,
  tags,
  archivedTags,
  activeTagCount,
  archivedTagCount,
  showArchivedTags,
  onToggleArchivedTags,
  onRenameTag,
  onArchiveTag,
  onRestoreTag,
  categoryForm,
  tagForm,
  archiveDialog,
}: CategoryListViewProps) {
  return (
    <div className="flex flex-col gap-s24">
      <BannerSlot isOpen={Boolean(actionError)}>
        {actionError ? (
          <Banner
            variant="error"
            title={actionError}
            actionLabel="Fechar"
            onAction={onDismissActionError}
          />
        ) : null}
      </BannerSlot>

      {isLoading ? <ContentSkeleton variant="sections" /> : null}

      {isError ? (
        <Banner
          variant="error"
          title="Não deu para carregar as categorias"
          description="Confira se o app está rodando e tente de novo."
          actionLabel="Tentar de novo"
          onAction={onRetry}
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <CategoryFilter
            search={searchText}
            onSearchChange={onSearchChange}
            filter={filter}
            onFilterChange={onFilterChange}
            counts={counts}
            showSearch={!showsTags}
          />
          {showsTags ? null : (
            <CategoryList
              categories={categories}
              label={listLabel}
              emptyMessage={emptyMessage}
              onOpen={onOpenCategory}
              onEdit={onEditCategory}
              onArchive={onRequestArchive}
              onRestore={onRestoreCategory}
            />
          )}
          {showsArchivedNote && !showsTags ? (
            <p className="text-label text-fg-secondary">
              Arquivadas saem da escolha de categoria. As transações continuam nelas no histórico.
            </p>
          ) : null}

          {showsTags ? (
            <Section
              title="Tags"
              action={
                <>
                  <CountBadge count={activeTagCount} />
                  {archivedTagCount > 0 ? (
                    <Button
                      variant="tertiary"
                      size="sm"
                      aria-expanded={showArchivedTags}
                      onPress={onToggleArchivedTags}
                    >
                      {showArchivedTags
                        ? 'Esconder arquivadas'
                        : `Arquivadas (${archivedTagCount})`}
                    </Button>
                  ) : null}
                </>
              }
            >
              <p className="text-label text-fg-secondary">
                Número de transações com cada tag, em todo o histórico. Use o menu … de cada tag
                para renomear ou arquivar.
              </p>
              {tags.length === 0 ? (
                <p className="text-label text-fg-secondary">
                  Nenhuma tag ainda. Use o “+” (Nova tag) para criar a primeira.
                </p>
              ) : null}
              <TagList
                tags={tags}
                label="Tags"
                onRename={onRenameTag}
                onArchive={onArchiveTag}
                onRestore={onRestoreTag}
              />
              {archivedTagCount > 0 ? (
                <Collapse
                  isOpen={showArchivedTags}
                  trackClassName="-mt-s16"
                  contentClassName="pt-s16"
                >
                  <TagList
                    tags={archivedTags}
                    label="Tags arquivadas"
                    onRename={onRenameTag}
                    onArchive={onArchiveTag}
                    onRestore={onRestoreTag}
                  />
                </Collapse>
              ) : null}
            </Section>
          ) : null}
        </>
      ) : null}

      <CategoryForm
        target={categoryForm.target}
        onClose={categoryForm.onClose}
        onArchive={categoryForm.onArchive}
        onRestore={categoryForm.onRestore}
      />
      <TagForm target={tagForm.target} onClose={tagForm.onClose} onArchive={tagForm.onArchive} />
      {archiveDialog ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => !open && archiveDialog.onClose()}
          title={archiveDialog.title}
          description={archiveDialog.description}
          icon="archive"
          changes={archiveDialog.changes}
          confirmLabel={archiveDialog.confirmLabel}
          loading={archiveDialog.loading}
          onConfirm={archiveDialog.onConfirm}
        />
      ) : null}
    </div>
  );
}
