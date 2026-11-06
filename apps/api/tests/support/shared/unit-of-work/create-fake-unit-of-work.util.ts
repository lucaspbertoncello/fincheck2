import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// A unit of work for tests with doubles: it hands over a stand-in executor (the doubles ignore it)
// and does not open a transaction. Tests that need the real commit and rollback use
// `KyselyUnitOfWork` on a real database.
export function createFakeUnitOfWork(): UnitOfWork<Kysely<Database>> & { runs: number } {
  const executor = {} as Kysely<Database>;
  const unitOfWork = {
    runs: 0,
    async run<Result>(work: (executor: Kysely<Database>) => Promise<Result>): Promise<Result> {
      unitOfWork.runs++;
      return work(executor);
    },
  };

  return unitOfWork;
}
