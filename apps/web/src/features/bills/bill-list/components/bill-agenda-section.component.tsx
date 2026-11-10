import { BillRow, Section } from '@fincheck/ui';

import type { BillRowModel, DebtTarget } from '#/features/bills/bill-list/bill-list.model.ts';
import { DebtMenu } from '#/features/bills/components/debt-menu.component.tsx';
import { MenuSpace } from '#/shared/components/lists/menu-space.component.tsx';

type BillAgendaSectionProps = {
  title: string;
  /** Right side of the header: "Até 31/10", "Bradesco vence 28/10, Nubank vence 06/11". */
  note?: string;
  /** One sentence under the header ("O reembolso abate e não vira receita."). */
  intro?: string;
  rows: readonly BillRowModel[];
  divider?: boolean;
  onRowAction: (key: string) => void;
  onRowEdit?: (billId: string) => void;
  onRowOpenInvoice?: (target: { accountId: string; month: string }) => void;
  /** The screen has friend debts: they carry a "…" menu and the other rows keep its space. */
  withMenu?: boolean;
  onDebtEdit?: (billId: string) => void;
  onDebtDelete?: (target: DebtTarget) => void;
};

/** A section of the agenda: header with its note and the rows as `BillRow`. Renders nothing when empty. */
export function BillAgendaSection({
  title,
  note,
  intro,
  rows,
  divider = true,
  onRowAction,
  onRowEdit,
  onRowOpenInvoice,
  withMenu = false,
  onDebtEdit,
  onDebtDelete,
}: BillAgendaSectionProps) {
  if (rows.length === 0) return null;

  return (
    <Section
      title={title}
      divider={divider}
      action={note ? <span className="text-label text-fg-secondary">{note}</span> : undefined}
    >
      {intro ? <p className="-mt-s8 text-label text-fg-secondary">{intro}</p> : null}
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {rows.map((row) => (
          <BillRow
            key={row.key}
            name={row.name}
            icon={row.icon}
            service={row.service}
            flow={row.flow}
            status={row.status}
            badges={row.badges}
            dueText={row.dueText}
            foundPayment={row.foundPayment}
            amountCents={row.amountCents}
            settledCents={row.settledCents}
            onAction={row.actionable ? () => onRowAction(row.key) : undefined}
            secondaryAction={
              onRowOpenInvoice && row.invoiceTarget
                ? {
                    label: 'Ver fatura',
                    onPress: () =>
                      onRowOpenInvoice(row.invoiceTarget as NonNullable<typeof row.invoiceTarget>),
                  }
                : undefined
            }
            onEdit={
              onRowEdit && row.editBillId ? () => onRowEdit(row.editBillId as string) : undefined
            }
            menu={
              !withMenu ? undefined : row.debt && onDebtEdit && onDebtDelete ? (
                <DebtMenu
                  name={row.name}
                  onEdit={() => onDebtEdit((row.debt as DebtTarget).billId)}
                  onDelete={() => onDebtDelete(row.debt as DebtTarget)}
                />
              ) : (
                <MenuSpace />
              )
            }
          />
        ))}
      </ul>
    </Section>
  );
}
