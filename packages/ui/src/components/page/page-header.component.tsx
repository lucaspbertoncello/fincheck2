import type { ReactNode } from 'react';

import { CardDot } from '#/components/brand/card-dot.component.tsx';

type PageHeaderProps = {
  title: string;
  /** The date line under the title (`DateLine`). */
  date: ReactNode;
  /** Extra line under the date (only the Visão geral has one). */
  extra?: ReactNode;
  /** Month picker and sub-tabs. Desktop: right of the title, centered on its line. Mobile: own line below. */
  actions?: ReactNode;
};

/**
 * Header of every page: title with the card dot, the date line, and, where the month filters,
 * the picker (components.md 1.4). The picker is centered on the title line on every screen
 * (ui adjustment 5).
 */
export function PageHeader({ title, date, extra, actions }: PageHeaderProps) {
  return (
    <header className="grid gap-y-s4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-s16">
      <h1 className="flex items-center gap-s8 font-title text-page-title-mobile leading-(--line-height-title) font-emphasis tracking-(--letter-spacing-title) text-fg-primary lg:col-start-1 lg:row-start-1 lg:text-page-title">
        <CardDot />
        {title}
      </h1>
      <div className="lg:col-span-2">{date}</div>
      {extra ? <div className="lg:col-span-2">{extra}</div> : null}
      {actions ? (
        <div className="mt-s12 flex flex-wrap items-center gap-s12 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
