import { CategoryIcon, Icon, type IconSize } from '@fincheck/ui';

import { CATEGORY_ICON_SAMPLES, ICON_NAMES } from '#gallery/constants/gallery-icons.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';

const SIZES: IconSize[] = ['xs', 'sm', 'md', 'base', 'lg'];

function IconGrid() {
  return (
    <ul className="m-0 grid w-full list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-s8 p-0">
      {ICON_NAMES.map((name) => (
        <li
          key={name}
          className="flex flex-col items-center gap-s8 rounded-input border border-line p-s12 text-fg-primary"
        >
          <Icon name={name} size="lg" />
          <span className="text-caption break-all text-center text-fg-secondary">{name}</span>
        </li>
      ))}
    </ul>
  );
}

export const ICONS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'icon-grid',
    title: `Icon: todos os nomes (${ICON_NAMES.length})`,
    content: <IconGrid />,
  },
  {
    id: 'icon-sizes',
    title: 'Icon: tamanhos',
    content: (
      <>
        {SIZES.map((size) => (
          <GalleryVariant key={size} caption={size}>
            <Icon name="wallet" size={size} className="text-brand" />
          </GalleryVariant>
        ))}
      </>
    ),
  },
  {
    id: 'category-icon',
    title: 'CategoryIcon',
    content: (
      <>
        <GalleryVariant caption="row (sem selo)">
          <div className="flex gap-s12">
            {CATEGORY_ICON_SAMPLES.map((icon) => (
              <CategoryIcon key={icon} icon={icon} />
            ))}
          </div>
        </GalleryVariant>
        <GalleryVariant caption="lg (48 px)">
          <div className="flex gap-s12">
            {CATEGORY_ICON_SAMPLES.slice(0, 4).map((icon) => (
              <CategoryIcon key={icon} icon={icon} size="lg" />
            ))}
          </div>
        </GalleryVariant>
        <GalleryVariant caption="selo income / expense / transfer">
          <div className="flex gap-s12">
            <CategoryIcon icon="salary" type="income" />
            <CategoryIcon icon="food" type="expense" />
            <CategoryIcon icon="transfer" type="transfer" />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="selo em lg">
          <div className="flex gap-s12">
            <CategoryIcon icon="salary" size="lg" type="income" />
            <CategoryIcon icon="food" size="lg" type="expense" />
            <CategoryIcon icon="transfer" size="lg" type="transfer" />
          </div>
        </GalleryVariant>
        <GalleryVariant caption="dashed (arquivada / sem categoria)">
          <div className="flex gap-s12">
            <CategoryIcon icon="tag" dashed />
            <CategoryIcon icon="tag" dashed type="expense" />
            <CategoryIcon icon="tag" dashed size="lg" />
          </div>
        </GalleryVariant>
      </>
    ),
  },
];
