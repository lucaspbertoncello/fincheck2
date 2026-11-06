import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

import type {
  CardBlockData,
  InvoiceBlockData,
} from '#/features/accounts/account-list/types/account-list.type.ts';
import { buildAccountMenuItems } from '#/features/accounts/account-list/utils/build-account-menu-items.util.ts';
import { resolveAccountTheme } from '#/features/accounts/utils/resolve-account-theme.util.ts';
import { buildInvoiceDueLine } from '#/domain/invoices/invoice/rules/build-invoice-due-line.rule.ts';
import { getCycleProgress } from '#/domain/invoices/invoice/rules/get-cycle-progress.rule.ts';
import { mapInvoiceStatus } from '#/domain/invoices/invoice/rules/map-invoice-status.rule.ts';

const MAX_INSTALLMENTS = 3;

type BuildCardBlockInput = {
  card: Account.Dto;
  invoice: Invoice.Dto | undefined;
  plans: readonly InstallmentPlan.Dto[];
  /** Today as a business date. */
  today: string;
};

function buildInvoiceBlock(invoice: Invoice.Dto, today: string): InvoiceBlockData {
  const status = mapInvoiceStatus(invoice.status);
  const cycleProgress =
    status === 'open'
      ? getCycleProgress(invoice.closesOn, today)
      : status === 'closed' || status === 'partial' || status === 'overdue'
        ? 1
        : undefined;

  return {
    month: invoice.month,
    status,
    totalCents: invoice.totalCents,
    dueLine: buildInvoiceDueLine(invoice),
    cycleProgress,
    isEditable: invoice.isEditable,
  };
}

/** A credit card with its invoice and its next installments, ready to draw. */
export function buildCardBlock({
  card,
  invoice,
  plans,
  today,
}: BuildCardBlockInput): CardBlockData {
  const details = card.creditCard;
  const installments = plans
    .filter((plan) => plan.accountId === card.id && plan.nextInstallment)
    .sort((a, b) =>
      (a.nextInstallment?.invoiceMonth ?? '').localeCompare(b.nextInstallment?.invoiceMonth ?? ''),
    )
    .slice(0, MAX_INSTALLMENTS)
    .map((plan) => ({
      id: plan.id,
      merchant: plan.description,
      partLabel: `Parcela ${plan.nextInstallment?.number ?? 0} de ${plan.installmentCount}`,
      cents: plan.nextInstallment?.amountCents ?? 0,
    }));

  return {
    id: card.id,
    theme: resolveAccountTheme(card),
    nickname: card.name,
    last4: details?.last4 ?? '',
    dueLabel: `Vence dia ${String(details?.dueDay ?? 0).padStart(2, '0')}`,
    bankName: card.institutionName ?? undefined,
    invoice: invoice ? buildInvoiceBlock(invoice, today) : null,
    installments,
    menuItems: buildAccountMenuItems(Boolean(card.archivedAt)),
  };
}
