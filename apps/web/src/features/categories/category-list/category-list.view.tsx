import {
  Banner,
  BannerSlot,
  Button,
  CategoryFilter,
  CategoryList,
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
  tagGroups,
  activeTagCount,
  archivedTagCount,
  showArchivedTags,
  onToggleArchivedTags,
  onCreateTag,
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
                Cada tag pertence a uma categoria e só aparece nas transações dela. Para criar uma,
                use “Nova tag” dentro da categoria. Número de transações com cada tag, em todo o
                histórico; o menu … renomeia ou arquiva.
              </p>
              {tagGroups.map((group) => (
                <section
                  key={group.categoryId}
                  aria-label={`Tags de ${group.name}`}
                  className="flex flex-col gap-s12"
                >
                  <h3 className="text-label font-emphasis text-fg-primary">{group.name}</h3>
                  <TagList
                    tags={group.tags}
                    label={`Tags de ${group.name}`}
                    onRename={onRenameTag}
                    onArchive={onArchiveTag}
                    onRestore={onRestoreTag}
                    onCreate={group.canCreate ? () => onCreateTag(group.categoryId) : undefined}
                    createLabel="Nova tag"
                  />
                  {showArchivedTags && group.archivedTags.length > 0 ? (
                    <TagList
                      tags={group.archivedTags}
                      label={`Tags arquivadas de ${group.name}`}
                      onRename={onRenameTag}
                      onArchive={onArchiveTag}
                      onRestore={onRestoreTag}
                    />
                  ) : null}
                </section>
              ))}
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
