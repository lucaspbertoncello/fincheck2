import { Icon } from '#/components/icons/icon.component.tsx';

type StaleChipProps = {
  children: string;
};

/** "dado do Bradesco de ontem": warning chip shown when a bank failed to sync. */
export function StaleChip({ children }: StaleChipProps) {
  return (
    <p className="inline-flex w-fit items-center gap-s4 rounded-capsule bg-caution-weak px-s8 py-s4 text-meta text-caution">
      <Icon name="warning" size="xs" />
      {children}
    </p>
  );
}
