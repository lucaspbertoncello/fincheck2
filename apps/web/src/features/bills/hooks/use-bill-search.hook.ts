import { useNavigate, useSearch } from '@tanstack/react-router';

type NewBillModal = 'bill' | 'debt';

type BillSearch = { month?: string; new?: string; pay?: string; edit?: string };

type BillSearchPatch = {
  new?: NewBillModal | undefined;
  pay?: string | undefined;
  edit?: string | undefined;
};

/**
 * The screen state that lives in the URL besides the month: which creation modal is open
 * (`?new=bill` or `?new=debt`, what the "+" of the shell sets) and which agenda item the payment
 * dialog is about (`?pay=<item key>`). `?edit=<billId>` opens the bill form to edit.
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
    payKey: search.pay ?? null,
    editBillId: search.edit ?? null,
    openNewModal: (modal: NewBillModal) => update({ new: modal }),
    closeNewModal: () => update({ new: undefined }),
    openPayment: (key: string) => update({ pay: key }),
    closePayment: () => update({ pay: undefined }),
    openEditBill: (id: string) => update({ edit: id }),
    closeEditBill: () => update({ edit: undefined }),
  };
}
