import type { ReactNode } from 'react';

type StackedPanelsProps = {
  /** The key of the panel that shows. */
  active: string;
  /** Every panel that can show. A `null` panel takes no room. */
  panels: Readonly<Record<string, ReactNode>>;
  className?: string;
};

/**
 * Panels in the same grid cell, one visible: the cell is as tall as the tallest, so switching the
 * panel (Open Finance | manual, form | problem) never resizes the modal. The ones not showing are
 * invisible, out of the tab order and out of the accessibility tree.
 */
export function StackedPanels({ active, panels, className }: StackedPanelsProps) {
  return (
    <div className={`grid ${className ?? ''}`}>
      {Object.entries(panels).map(([key, panel]) => {
        if (panel === null || panel === undefined) return null;
        const isActive = key === active;
        return (
          <div
            key={key}
            inert={!isActive}
            aria-hidden={isActive ? undefined : true}
            className={`col-start-1 row-start-1 flex min-w-0 flex-col gap-s16 lg:gap-s24 ${isActive ? '' : 'invisible'}`}
          >
            {panel}
          </div>
        );
      })}
    </div>
  );
}
