import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';

type ReviewLinkProps = {
  count: number;
  /** "Sem categoria, do Bradesco". */
  subtitle: string;
  href: string;
};

/** "Para revisar" row of the panel: opens the review queue (components.md 2.2). */
export function ReviewLink({ count, subtitle, href }: ReviewLinkProps) {
  return (
    <Link
      href={href}
      className="flex min-h-12 cursor-pointer items-center gap-s12 rounded-panel bg-brand-weak px-s16 py-s8 no-underline outline-none transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle"
    >
      <Icon name="inbox" size="lg" className="text-brand" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-s8 text-list text-fg-primary">
          Para revisar
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-capsule bg-brand-weak px-s8 text-caption font-emphasis text-brand">
            {count}
          </span>
        </span>
        <span className="text-meta text-fg-secondary">{subtitle}</span>
      </span>
      <Icon name="chevron-right" size="sm" className="text-fg-secondary" />
    </Link>
  );
}
