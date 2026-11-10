import { useNavigate, useSearch } from '@tanstack/react-router';

type NewBillModal = 'bill' | 'debt';

type BillSearch = {
  month?: string;
  new?: string;
  pay?: string;
  edit?: string;
  debt?: string;
  friend?: string;
};

type BillSearchPatch = {
  new?: NewBillModal | undefined;
  pay?: string | undefined;
  edit?: string | undefined;
  debt?: string | undefined;
  friend?: string | undefined;
};

/** The URL parser turns "123" into a number; a name or an id stays text. */
function asText(value: unknown): string | null {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * The screen state that lives in the URL besides the month: which creation modal is open
 * (`?new=bill` or `?new=debt`, what the "+" of the shell sets) and which agenda item the payment
 * dialog is about (`?pay=<item key>`). `?edit=<billId>` opens the bill form to edit and
 * `?debt=<billId>` the friend debt form; `?friend=<name>` with `?new=debt` starts the new debt with
 * that person already filled in.
 */
export function useBillSearch() {
  const search: BillSearch = useSearch({ strict: false });
  const navigate = useNavigate();

  function update(patch: BillSearchPatch) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...patch })) as never,
    });
  }

  return {
    newModal: search.new === 'bill' || search.new === 'debt' ? search.new : null,
    payKey: asText(search.pay),
    editBillId: asText(search.edit),
    debtId: asText(search.debt),
    friendName: asText(search.friend),
    openNewModal: (modal: NewBillModal) => update({ new: modal }),
    openNewDebtFor: (name: string) => update({ new: 'debt', friend: name }),
    closeNewModal: () => update({ new: undefined, friend: undefined }),
    openPayment: (key: string) => update({ pay: key }),
    closePayment: () => update({ pay: undefined }),
    openEditBill: (id: string) => update({ edit: id }),
    closeEditBill: () => update({ edit: undefined }),
    openEditDebt: (id: string) => update({ debt: id }),
    closeEditDebt: () => update({ debt: undefined }),
  };
}
