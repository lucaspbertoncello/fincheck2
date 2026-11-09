import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { GetProfileHighlightsQuery } from '#/modules/profile/application/highlight/get-profile-highlights.query.ts';
import type { ProfilePixReader } from '#/modules/profile/application/highlight/profile-pix-reader.interface.ts';
import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';
import { GetProfileQuery } from '#/modules/profile/application/profile/get-profile.query.ts';
import type { ProfileIncomeSourceReader } from '#/modules/profile/application/profile/profile-income-source-reader.interface.ts';
import { ProfileDtoBuilder } from '#/modules/profile/application/profile/profile-dto-builder.service.ts';
import { UpdateProfileUseCase } from '#/modules/profile/application/profile/update-profile.usecase.ts';
import { GetProfileHighlightsController } from '#/modules/profile/http/highlight/get-profile-highlights.controller.ts';
import { createProfileHighlightsRoute } from '#/modules/profile/http/highlight/profile-highlights.route.ts';
import { GetProfileController } from '#/modules/profile/http/profile/get-profile.controller.ts';
import { createProfileRoute } from '#/modules/profile/http/profile/profile.route.ts';
import { UpdateProfileController } from '#/modules/profile/http/profile/update-profile.controller.ts';
import { KyselyProfileRepository } from '#/modules/profile/infra/profile/profile.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `profile` module by hand: its routes. It asks two owners through ports: `recurrences`
// (the active income recurrences, which are the sources of income) and `transactions` (the
// spending lines and the biggest Pix of the curiosities).
export function createProfileModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  incomeSources: ProfileIncomeSourceReader;
  spending: ProfileSpendingReader;
  pix: ProfilePixReader;
}) {
  const { db, unitOfWork, clock, incomeSources, spending, pix } = deps;

  const profiles = new KyselyProfileRepository(db);
  const builder = new ProfileDtoBuilder(incomeSources);

  const routes = new Hono()
    .route(
      '/',
      createProfileRoute({
        getProfile: new GetProfileController(new GetProfileQuery(profiles, builder, clock)),
        updateProfile: new UpdateProfileController(
          new UpdateProfileUseCase(profiles, builder, unitOfWork, clock),
        ),
      }),
    )
    .route(
      '/',
      createProfileHighlightsRoute({
        getProfileHighlights: new GetProfileHighlightsController(
          new GetProfileHighlightsQuery(spending, pix, clock),
        ),
      }),
    );

  return { routes };
}
