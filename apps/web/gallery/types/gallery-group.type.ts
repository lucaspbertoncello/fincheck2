import type { ReactNode } from 'react';

/** One component (or a family) of the gallery: a titled block with its variations. */
export type GallerySectionDef = {
  id: string;
  title: string;
  content: ReactNode;
};

/** One entry of the side index: a group of sections. */
export type GalleryGroupDef = {
  id: string;
  title: string;
  sections: GallerySectionDef[];
};
