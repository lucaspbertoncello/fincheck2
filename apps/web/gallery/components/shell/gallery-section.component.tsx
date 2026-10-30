import type { ReactNode } from 'react';

type GallerySectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/** A component's block: title and its variations in a wrapping row. */
export function GallerySection({ id, title, children }: GallerySectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-line pt-s24"
    >
      <h3
        id={`${id}-title`}
        className="mb-s16 font-title font-heading text-section text-fg-primary"
      >
        {title}
      </h3>
      <div className="flex flex-wrap items-start gap-x-s32 gap-y-s24">{children}</div>
    </section>
  );
}
