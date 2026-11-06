/** Reads the `<cardId>:<YYYY-MM>` of the invoice params; null when it is not in that shape. */
export function splitInvoiceTarget(
  target: string | undefined,
): { accountId: string; month: string } | null {
  if (!target) return null;
  const [accountId, month] = target.split(':');
  if (!accountId || !month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  return { accountId, month };
}
