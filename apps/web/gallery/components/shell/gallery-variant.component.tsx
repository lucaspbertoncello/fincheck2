import type { ReactNode } from 'react';

type GalleryVariantProps = {
  /** What this variation shows ("Desabilitado"). */
  caption: string;
  /** Width of the stage in px; "full" fills the row; default hugs the content. */
  width?: number | 'full';
  children: ReactNode;
};

/** One variation: a small caption over the component, side by side with its siblings. */
export function GalleryVariant({ caption, width, children }: GalleryVariantProps) {
  const style =
    width === 'full'
      ? { flex: '1 1 100%', minWidth: 0 }
      : width
        ? { width: `min(${width}px, 100%)`, maxWidth: '100%' }
        : undefined;
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-s8" style={style}>
      <figcaption className="text-caption text-fg-tertiary">{caption}</figcaption>
      <div className="min-w-0">{children}</div>
    </figure>
  );
}
