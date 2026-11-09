// A transaction presumes at most one bill: the one that falls due first (then the oldest, then by
// id). Returns the ids of the bills that keep their presumed transaction; the others lose it.
export function pickPresumedBillOwners(
  claims: { billId: string; transactionId: string; dueOn: string; createdAt: string }[],
): Set<string> {
  const inOrder = claims.toSorted(
    (a, b) =>
      a.dueOn.localeCompare(b.dueOn) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.billId.localeCompare(b.billId),
  );
  const taken = new Set<string>();
  const owners = new Set<string>();

  for (const claim of inOrder) {
    if (taken.has(claim.transactionId)) continue;
    taken.add(claim.transactionId);
    owners.add(claim.billId);
  }

  return owners;
}
