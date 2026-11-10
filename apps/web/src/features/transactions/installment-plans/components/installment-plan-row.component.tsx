import { CategoryIcon, Chip, Collapse, Icon, ListRow, Money, OverflowMenu } from '@fincheck/ui';
import { useId, useState } from 'react';

import type { InstallmentPlanRowData } from '#/features/transactions/installment-plans/types/installment-plans.type.ts';

type InstallmentPlanRowProps = {
  plan: InstallmentPlanRowData;
  /** The line above is the list's own rule: the first row has none. */
  first: boolean;
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
};

const MENU_ITEMS = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'delete', label: 'Excluir', icon: 'trash', danger: true },
] as const;

/**
 * One plan of the card on the standard list row: the category icon, the description (it opens the
 * installments, with a chevron after the badge), "Parcela 3 de 10 · primeira fatura mai/26" as the
 * detail, the total at the right end over what is left, and the "…" menu with "Editar" and
 * "Excluir". A plan of the bank has no menu (the app rebuilds it at every sync): an empty box of the
 * same size keeps its value in the column of the others. The installments unfold under the row with
 * `Collapse`, in the column of the value.
 */
export function InstallmentPlanRow({ plan, first, onEdit, onDelete }: InstallmentPlanRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <li className={first ? undefined : 'border-t border-line'}>
      <ListRow
        as="div"
        mark={<CategoryIcon icon={plan.icon} type="expense" dashed={plan.uncategorized} />}
        name={plan.name}
        onOpen={() => setIsOpen((current) => !current)}
        openLabel={`Parcelas de ${plan.name}`}
        expanded={isOpen}
        controls={panelId}
        // One unit, so the chevron never sits alone on a line.
        badges={[
          <span key="state" className="inline-flex items-center gap-s4">
            {plan.isFromBank ? <Chip tone="neutral">Do banco</Chip> : null}
            <Icon
              name="chevron-down"
              size="md"
              className={`text-fg-secondary transition-transform duration-(--duration-fast) ${isOpen ? 'rotate-180' : ''}`}
            />
          </span>,
        ]}
        detail={plan.detail}
        detailTitle={plan.detail}
        value={
          <Money
            cents={plan.totalCents}
            sign="minus"
            signColumn
            weight="plain"
            tone="expense"
            className="text-money-row"
          />
        }
        valueNote={
          plan.isSettled ? (
            'Quitada'
          ) : (
            <>
              faltam{' '}
              <Money cents={plan.remainingCents} sign="none" currency="inline" weight="plain" />
            </>
          )
        }
        menu={
          plan.isFromBank ? (
            <span aria-hidden="true" className="block size-ctl-touch lg:size-ctl-tab" />
          ) : (
            <OverflowMenu
              label={`Ações de ${plan.name}`}
              items={[...MENU_ITEMS]}
              onAction={(key) => (key === 'edit' ? onEdit(plan.id) : onDelete(plan.id))}
            />
          )
        }
      />
      <Collapse isOpen={isOpen} id={panelId} contentClassName="pb-s12">
        {/* Under the text (mark 36 or 40 px and 12 px), ending where the value ends (menu 44 or 40 px and 12 px). */}
        <div className="flex flex-col gap-s8 pr-14 pl-12 lg:pr-13 lg:pl-13">
          <ul
            aria-label={`Parcelas de ${plan.name}`}
            className="m-0 flex list-none flex-col gap-s8 p-0"
          >
            {plan.installments.map((item) => (
              <li key={item.number} className="flex items-baseline gap-s12">
                <span className="min-w-10 shrink-0 text-label whitespace-nowrap text-fg-secondary tabular-nums">
                  {item.dateLabel}
                </span>
                <span
                  title={item.label}
                  className="min-w-0 flex-1 truncate text-label text-fg-primary"
                >
                  {item.label}
                </span>
                {item.isNext ? (
                  <Chip tone="accent" className="shrink-0">
                    Próxima
                  </Chip>
                ) : null}
                <Money
                  cents={item.cents}
                  sign="minus"
                  signColumn
                  weight="plain"
                  tone="expense"
                  className="shrink-0 text-label"
                />
              </li>
            ))}
          </ul>
          {plan.isFromBank ? (
            <p className="text-meta text-fg-secondary">
              Compra do banco: o app a refaz a cada sincronização, por isso ela não se edita.
            </p>
          ) : null}
        </div>
      </Collapse>
    </li>
  );
}
