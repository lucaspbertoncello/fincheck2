import type { ReactNode } from 'react';

import { Collapse } from '#/components/disclosure/collapse.component.tsx';
import { cx } from '#/utils/class-names.util.ts';
import type { ListRowBadges } from '#/components/list-row/list-row.type.ts';

type ListRowProps = {
  /** Leading mark: the category icon, an avatar or a bank mark. */
  mark: ReactNode;
  /** Plain-text name; one line, truncated with a `title` when it does not fit. */
  name: string;
  /** Makes the name a real button (Enter and Space work), e.g. to open the item to edit. */
  onOpen?: () => void;
  /** Accessible name of that button ("Editar Internet Fibra"). */
  openLabel?: string;
  /** Classes of the name ("text-fg-tertiary line-through" for a dismissed item). */
  nameClassName?: string;
  /** The detail line under the name: one line from the desktop, two on the phone, then cut. */
  detail?: ReactNode;
  /** Plain-text version of `detail` for the `title`. Leave it out when the detail has money in it. */
  detailTitle?: string;
  /** At most two badges, after the name (they drop under it when the name is long). */
  badges?: ListRowBadges;
  /** The main value, always at the right end of the row. */
  value?: ReactNode;
  /** Secondary reference under the value ("de R$ 800,00"): the composed value in two lines. */
  valueNote?: ReactNode;
  /** Anything that belongs under the value, like the partial bar. */
  valueExtra?: ReactNode;
  /** Overflow "…" menu, after the value. Give it to every row of a list or to none. */
  menu?: ReactNode;
  /** The action strip: its own line under the text, left-aligned with it. */
  actions?: ReactNode;
  /**
   * Makes the strip fold: it opens and closes with the system `Collapse` and takes no room while
   * closed (a warning that appears and goes away). Give it with `actions`, which may be `null` while
   * closed (the strip keeps the last content until it has folded). Left out, the strip is static.
   */
  actionsOpen?: boolean;
  /**
   * The element of the row. An `li` by default; use `div` when the caller already wraps the row in
   * its own `li` (a fold animation needs a wrapper, and an `li` inside an `li` is not a list).
   */
  as?: 'li' | 'div';
  className?: string;
};

/**
 * Standard list row (components.md 10.0): mark at the left, name and one detail line, the value at
 * the right end (tabular, same column in every row), the "…" menu after it and the actions on a
 * strip of their own under the text. Two badges at most; a long name or detail truncates with a
 * `title`; money, badges and buttons never wrap. The strip sits on the 16 px scale step above the
 * divider. The same layout from 375 px up.
 */
export function ListRow({
  mark,
  name,
  onOpen,
  openLabel,
  nameClassName,
  detail,
  detailTitle,
  badges,
  value,
  valueNote,
  valueExtra,
  menu,
  actions,
  actionsOpen,
  as: Element = 'li',
  className,
}: ListRowProps) {
  const shownBadges = badges?.slice(0, 2);
  const nameClass = cx(
    'min-w-0 max-w-full truncate text-body font-emphasis text-fg-primary',
    nameClassName,
  );

  const hasNote = Boolean(valueNote || valueExtra);
  const foldingStrip = actionsOpen !== undefined;

  return (
    <Element
      className={cx(
        'grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-y-s4 py-s12',
        actions && !foldingStrip ? 'pb-s16' : undefined,
        className,
      )}
    >
      <div className="col-start-1 row-start-1 mr-s12 self-start">{mark}</div>
      <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-s8 gap-y-s4">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={openLabel}
            title={name}
            className={cx(
              nameClass,
              'focus-ring -mx-s4 cursor-pointer rounded-input px-s4 text-left hover:underline',
            )}
          >
            {name}
          </button>
        ) : (
          <p title={name} className={nameClass}>
            {name}
          </p>
        )}
        {shownBadges?.map((badge, index) => (
          <span key={index} className="shrink-0">
            {badge}
          </span>
        ))}
      </div>
      {value ? (
        <div className="col-start-3 row-start-1 ml-s12 shrink-0 self-start text-right whitespace-nowrap">
          {value}
        </div>
      ) : null}
      {detail ? (
        <p
          title={detailTitle}
          className={cx(
            'line-clamp-2 col-start-2 row-start-2 text-label text-fg-secondary lg:line-clamp-1',
            hasNote ? undefined : '-col-end-1',
          )}
        >
          {detail}
        </p>
      ) : null}
      {hasNote ? (
        <div className="col-start-3 row-start-2 ml-s12 flex min-w-0 flex-col items-end gap-s4 text-right whitespace-nowrap">
          {valueNote ? <span className="text-meta text-fg-secondary">{valueNote}</span> : null}
          {valueExtra}
        </div>
      ) : null}
      {menu ? (
        <div className="col-start-4 row-start-1 ml-s12 -mr-s8 -mt-s8 self-start">{menu}</div>
      ) : null}
      {foldingStrip ? (
        <Collapse
          isOpen={actionsOpen}
          trackClassName="col-start-1 row-start-3 -col-end-1 -mt-s4 lg:col-start-2"
          contentClassName="pt-s8 pb-s4"
        >
          <div className="flex flex-wrap items-center gap-s8">{actions}</div>
        </Collapse>
      ) : actions ? (
        <div className="col-start-1 row-start-3 mt-s4 -col-end-1 flex flex-wrap items-center gap-s8 lg:col-start-2">
          {actions}
        </div>
      ) : null}
    </Element>
  );
}
