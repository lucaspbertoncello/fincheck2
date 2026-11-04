import type { ReactNode } from 'react';

type RuleGroupHeadingProps = {
  id: string;
  children: ReactNode;
};

/** The quiet name of a block of the rule editor: 13 px tertiary and a hairline to the edge, like the groups of the modal. */
export function RuleGroupHeading({ id, children }: RuleGroupHeadingProps) {
  return (
    <div className="flex items-center gap-s12">
      <h3
        id={id}
        className="text-meta leading-none font-emphasis whitespace-nowrap text-fg-tertiary"
      >
        {children}
      </h3>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
