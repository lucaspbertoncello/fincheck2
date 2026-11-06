import { Skeleton } from '@fincheck/ui';

import { InvoiceHero } from '#/features/invoices/invoice-page/components/invoice-hero.component.tsx';
import type { InvoiceCardData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoicePageSkeletonProps = {
  /** The card is drawn as soon as it is known, so the card that travels from the list lands on it. */
  card: InvoiceCardData | null;
};

/**
 * The invoice page while it loads, at the size of the real thing: the card, the summary box, the
 * composition and the first lines. Same gaps as the loaded page, so nothing moves when the data
 * arrives.
 */
export function InvoicePageSkeleton({ card }: InvoicePageSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando a fatura"
      className="flex flex-col gap-s16 lg:gap-s24"
    >
      <InvoiceHero card={card}>
        <section className="glass flex flex-col gap-s16 p-s16 lg:p-s24">
          <div className="flex flex-col gap-s8">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-s8">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-32" />
          </div>
        </section>
      </InvoiceHero>
      <div className="glass flex flex-col gap-s16 p-s24">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-s12 py-s8">
            <Skeleton className="size-8 shrink-0" />
            <div className="flex flex-1 flex-col gap-s8">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-1.5 w-full" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="glass flex flex-col gap-s16 p-s24">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-11 w-full" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-s12 py-s12">
            <Skeleton className="size-9 shrink-0 lg:size-10" />
            <div className="flex flex-1 flex-col gap-s8">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
