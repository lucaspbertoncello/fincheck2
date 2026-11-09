import type { DashboardTestWorld } from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';

// The "Exemplo 1" of the ERD (22/10/2026, a Thursday), the numbers the contract of `dashboard` uses:
// a balance of R$ 5.408,98 in three accounts, R$ 4.625,00 still to receive (Maxxy, and the second
// half of the Mesada), R$ 2.326,69 still to pay (the Nubank invoice with the Celular expected, the
// Bradesco invoice already paid by a debit nobody tied yet, Diarista late, Academia, Internet and
// R$ 300,00 of what is owed to Rafa) and so a Livre of R$ 7.707,29 over 10 days.
export async function seedExampleOne(world: DashboardTestWorld) {
  const { db } = world;

  const nubank = await world.bankAccount('Nubank conta', 341258);
  const bradesco = await world.bankAccount('Bradesco conta', 187640);
  const wallet = await world.manualAccount('Carteira', {
    type: 'wallet',
    institution_code: 'wallet',
  });
  await insertTestTransaction(db, wallet, {
    nature: 'balance_adjustment',
    nature_set_by: 'user',
    description: 'Ajuste de saldo',
    amount_cents: 12000,
    occurred_on: '2026-10-01',
  });

  // Nubank closes on the 30th and falls due on the 6th: today the open invoice is 2026-10.
  const nubankCard = await world.card('Nubank', 30, 6);
  await world.purchase(nubankCard, 80000, '2026-10-05', '2026-10', { description: 'Mercado' });
  await world.purchase(nubankCard, 44190, '2026-10-12', '2026-10', { description: 'Restaurante' });
  const plan = await insertTestInstallmentPlan(db, nubankCard, {
    purchase_on: '2026-08-10',
    total_cents: 320000,
    installment_count: 10,
    first_invoice_month: '2026-08',
  });
  await insertTestTransaction(db, nubankCard, {
    origin: 'bank',
    method: 'credit',
    nature: 'expense',
    nature_set_by: 'system',
    description: 'Cadeira 03/10',
    amount_cents: -32000,
    occurred_on: '2026-08-10',
    invoice_month: '2026-10',
    installment_plan_id: plan,
    installment_number: 3,
  });

  // Bradesco closes on the 20th and falls due on the 28th: 2026-10 is closed, R$ 1.284,90, and the
  // debit of the payment already left the checking account (it is a payment found, presumed).
  const bradescoCard = await world.card('Bradesco', 20, 28);
  await world.purchase(bradescoCard, 128490, '2026-10-05', '2026-10', { description: 'Viagem' });
  const bradescoPayment = await world.invoicePaymentDebit(bradesco, 128490, '2026-10-21');

  // The recurrences: Celular is on the Nubank card (it goes into the invoice), the others leave the
  // checking account.
  const celular = await world.recurrence({
    name: 'Celular',
    expectedAmountCents: 5499,
    dateRule: { type: 'fixed_day', day: 28 },
    accountId: nubankCard,
    method: 'credit',
  });
  const diarista = await world.recurrence({
    name: 'Diarista',
    expectedAmountCents: 18000,
    dateRule: { type: 'fixed_day', day: 5 },
    accountId: nubank,
    method: 'pix',
  });
  const academia = await world.recurrence({
    name: 'Academia',
    expectedAmountCents: 10990,
    dateRule: { type: 'fixed_day', day: 25 },
    accountId: nubank,
    method: 'debit',
  });
  const internet = await world.recurrence({
    name: 'Internet',
    expectedAmountCents: 11990,
    dateRule: { type: 'fixed_day', day: 28 },
    accountId: nubank,
    method: 'debit',
  });
  const maxxy = await world.recurrence({
    kind: 'income',
    name: 'Maxxy',
    expectedAmountCents: 420000,
    dateRule: { type: 'around_day', day: 25, toleranceDays: 2 },
    accountId: nubank,
    method: 'pix',
    counterparty: 'G. PRADO',
    matchText: 'G PRADO',
  });
  const mesada = await world.recurrence({
    kind: 'income',
    name: 'Mesada',
    expectedAmountCents: 85000,
    dateRule: { type: 'any_day' },
    maxPayments: 2,
    accountId: nubank,
    method: 'pix',
  });
  const mesadaPix = await world.income(nubank, 42500, '2026-10-03', { description: 'Pix do pai' });
  const linked = await world.send('POST', `/occurrences/${mesada.occurrence?.id}/payments`, {
    transactionId: mesadaPix,
  });
  if (linked.status !== 201 && linked.status !== 200) {
    throw new Error(`linking the Mesada answered ${String(linked.status)}: ${await linked.text()}`);
  }

  // R$ 450,00 owed to Rafa, R$ 150,00 already paid, due on the 31st.
  const rafa = await world.bill({
    kind: 'friend',
    direction: 'payable',
    counterparty: 'Rafa',
    description: 'Ingresso do show',
    amountCents: 45000,
    dueOn: '2026-10-31',
  });
  const paidRafa = await world.send('POST', `/bills/${rafa.id}/payments`, {
    amountCents: 15000,
    paidOn: '2026-10-20',
  });
  if (paidRafa.status !== 201 && paidRafa.status !== 200) {
    throw new Error(`paying Rafa answered ${String(paidRafa.status)}: ${await paidRafa.text()}`);
  }

  return {
    nubank,
    bradesco,
    wallet,
    nubankCard,
    bradescoCard,
    bradescoPayment,
    celular,
    diarista,
    academia,
    internet,
    maxxy,
    mesada,
    rafa,
  };
}
