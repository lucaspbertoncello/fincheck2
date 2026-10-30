import { useCategoryListViewModel } from '#/features/categories/category-list/category-list.viewmodel.tsx';
import { CategoryListView } from '#/features/categories/category-list/category-list.view.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Categorias › Categorias: header and sub-tabs from the shell, the management list from the feature. */
export function CategoryListPage() {
  const viewModel = useCategoryListViewModel();

  return (
    <ScreenFrame screen={SCREENS.categories}>
      <CategoryListView {...viewModel} />
    </ScreenFrame>
  );
}
