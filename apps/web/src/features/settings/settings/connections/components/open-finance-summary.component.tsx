import { Icon, countLabel } from '@fincheck/ui';

type OpenFinanceSummaryProps = {
  bankCount: number;
  accountCount: number;
  /** Banks in error or with stale data. */
  attentionCount: number;
};

/**
 * "Open Finance conectado": the state of the whole connection in one glass card, a brand circle
 * with the plug, the title and the count of banks, accounts and cards (with what needs attention).
 */
export function OpenFinanceSummary({
  bankCount,
  accountCount,
  attentionCount,
}: OpenFinanceSummaryProps) {
  const parts = [
    countLabel(bankCount, 'banco', 'bancos'),
    countLabel(accountCount, 'conta ou cartão', 'contas e cartões'),
    attentionCount > 0
      ? `${attentionCount} ${attentionCount === 1 ? 'pede' : 'pedem'} atenção`
      : null,
  ].filter((part) => part !== null);

  return (
    <div className="glass flex items-center gap-s16 p-s16 lg:p-s24">
      <span className="grid size-ctl-touch shrink-0 place-items-center rounded-capsule bg-brand-weak text-brand">
        <Icon name="plug" size="lg" />
      </span>
      <div className="flex min-w-0 flex-col gap-s4">
        <p className="text-body font-emphasis text-fg-primary">Open Finance conectado</p>
        <p className="text-label text-fg-secondary">{parts.join(' · ')}</p>
      </div>
    </div>
  );
}
