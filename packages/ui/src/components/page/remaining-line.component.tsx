import { Money } from '#/components/money/money.component.tsx';
import { Skeleton } from '#/components/states/skeleton.component.tsx';
import type { RemainingLineData } from '#/components/page/remaining-line.type.ts';

type RemainingLineProps = {
  /** Without data the line shows a skeleton of the same height. */
  data?: RemainingLineData;
};

// Each fragment never breaks inside. The dot is a pseudo-element placed in a negative margin that
// the wrapper clips, so a fragment that starts a new line loses its dot (ui adjustment 6).
const FRAGMENT =
  "relative pl-s16 whitespace-nowrap before:absolute before:left-s4 before:content-['·']";

/** "Faltam 10 dias · ainda entram R$ 4.625,00 · ainda saem R$ 4.187,14" (components.md 1.4). */
export function RemainingLine({ data }: RemainingLineProps) {
  if (!data) {
    return <Skeleton className="mt-s4 h-5 w-full max-w-md" />;
  }
  const { daysLeft, incomeCents, expenseCents } = data;

  return (
    <p className="overflow-hidden text-meta text-fg-secondary lg:text-label">
      <span className="-ml-s16 flex flex-wrap">
        <span className="pl-s16 whitespace-nowrap">
          Faltam <span className="font-emphasis text-fg-primary">{daysLeft}</span>{' '}
          {daysLeft === 1 ? 'dia' : 'dias'}
        </span>
        <span className={FRAGMENT}>
          ainda entram <Money cents={incomeCents} sign="none" tone="income" weight="emphasis" />
        </span>
        <span className={FRAGMENT}>
          ainda saem <Money cents={expenseCents} sign="none" tone="expense" weight="emphasis" />
        </span>
      </span>
    </p>
  );
}
