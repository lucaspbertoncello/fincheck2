import { describe, expect, it } from 'vitest';

import { selectBackupsToDelete } from '#/modules/backup/domain/file/select-backups-to-delete.util.ts';

describe('selectBackupsToDelete', () => {
  const day = (n: number) => `fincheck-2026-10-${String(n).padStart(2, '0')}-030000.db`;

  it('selects what is beyond the newest ones, oldest included', () => {
    const names = [day(3), day(1), day(5), day(2), day(4)];

    expect(selectBackupsToDelete(names, 3).sort()).toEqual([day(1), day(2)]);
  });

  it('selects nothing when there are not more than the limit', () => {
    expect(selectBackupsToDelete([day(1), day(2)], 2)).toEqual([]);
  });

  it('orders by the instant in the name, not by the order of the list', () => {
    expect(selectBackupsToDelete([day(9), day(10)], 1)).toEqual([day(9)]);
  });

  it('never selects the file that was just written, even when it is older than the rest by name', () => {
    const future = Array.from({ length: 3 }, (_, i) => `fincheck-2027-01-0${i + 1}-030000.db`);

    expect(selectBackupsToDelete([...future, day(1)], 3, day(1))).toEqual([]);
    expect(selectBackupsToDelete([...future, day(1), day(2)], 3, day(1))).toEqual([day(2)]);
  });

  it('never selects what is not a backup name', () => {
    expect(
      selectBackupsToDelete(['notes.txt', 'fincheck-2026-10-01.db', day(1), day(2)], 1),
    ).toEqual([day(1)]);
  });
});
