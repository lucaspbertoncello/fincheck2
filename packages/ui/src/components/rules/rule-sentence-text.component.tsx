import type { ReactNode } from 'react';

/** The plain words between the tokens of the editor sentence ("Sempre que", "categorizar como"). */
export function RuleSentenceText({ children }: { children: ReactNode }) {
  return <span className="text-body text-fg-secondary">{children}</span>;
}
