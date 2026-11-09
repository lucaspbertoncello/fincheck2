import type { ReactNode } from 'react';

import { Chip } from '#/components/chips/index.ts';
import type { TransactionRowData } from '#/components/transactions/row/transaction-row.type.ts';

/** Categories and tags the detail line shows as chips; the rest becomes a "+N" chip. */
const MAX_CATEGORIES = 2;
const MAX_TAGS = 2;

/**
 * Gap after each chip, the alignment that keeps it inside the line of text, and the width limit: a
 * long name ends in an ellipsis (the label is a `truncate` span) instead of running past the column.
 */
const CHIP_CLASS = 'mr-s4 max-w-full align-middle';

/** The label of a chip: one line that truncates with an ellipsis when the chip is cut. */
function Label({ children }: { children: string }) {
  return <span className="min-w-0 truncate">{children}</span>;
}

/** What the "+N" chip says to a screen reader and on hover: the ones it hides. */
function describeHidden(names: readonly string[]): string {
  return `e mais ${names.length}: ${names.join(', ')}`;
}

type TransactionRowLabels = {
  chips: ReactNode[];
  /** The same labels as plain text, all of them (the `title` of the detail line). */
  plain: string[];
};

/**
 * The first thing of the detail line: the category of the transaction (one chip per part when it is
 * split, two at most and then "+N"; "Sem categoria" when it has none) and, next to it, its tags in
 * the same chip as the tag picker draws them. The chips are compact: 20 px, so a row with them is
 * as tall as one without.
 */
export function buildTransactionRowLabels(transaction: TransactionRowData): TransactionRowLabels {
  const names = transaction.categoryNames ?? [];
  const tags = transaction.tags ?? [];
  const chips: ReactNode[] = [];

  if (names.length === 0 && transaction.uncategorized) {
    chips.push(
      <Chip key="no-category" tone="dashed" compact className={CHIP_CLASS}>
        <Label>Sem categoria</Label>
      </Chip>,
    );
  }
  for (const name of names.slice(0, MAX_CATEGORIES)) {
    chips.push(
      <Chip key={`category-${name}`} compact className={CHIP_CLASS}>
        <Label>{name}</Label>
      </Chip>,
    );
  }
  if (names.length > MAX_CATEGORIES) {
    const hidden = describeHidden(names.slice(MAX_CATEGORIES));
    chips.push(
      <Chip key="more-categories" compact title={hidden} ariaLabel={hidden} className={CHIP_CLASS}>
        +{names.length - MAX_CATEGORIES}
      </Chip>,
    );
  }
  for (const tag of tags.slice(0, MAX_TAGS)) {
    chips.push(
      <Chip key={`tag-${tag}`} tone="tag" icon="hash" compact className={CHIP_CLASS}>
        <Label>{tag}</Label>
      </Chip>,
    );
  }
  if (tags.length > MAX_TAGS) {
    const hidden = describeHidden(tags.slice(MAX_TAGS).map((tag) => `#${tag}`));
    chips.push(
      <Chip
        key="more-tags"
        tone="tag"
        compact
        title={hidden}
        ariaLabel={hidden}
        className={CHIP_CLASS}
      >
        +{tags.length - MAX_TAGS}
      </Chip>,
    );
  }

  const plain = [
    ...(names.length === 0 && transaction.uncategorized ? ['Sem categoria'] : []),
    ...names,
    ...tags.map((tag) => `#${tag}`),
  ];

  return { chips, plain };
}
