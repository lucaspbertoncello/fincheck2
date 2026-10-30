import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

type OverviewLinkProps = {
  href: string;
  children: ReactNode;
};

/** Text link in the header of a block ("A pagar e receber", "Ver todas"): navigates through the router. */
export function OverviewLink({ href, children }: OverviewLinkProps) {
  return (
    <Link
      href={href}
      className="focus-ring cursor-pointer rounded-tiny text-label font-emphasis text-brand no-underline data-[hovered]:underline"
    >
      {children}
    </Link>
  );
}
