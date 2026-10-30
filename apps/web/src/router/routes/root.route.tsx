import { createRootRouteWithContext } from '@tanstack/react-router';

import type { RouterContext } from '#/router/router-context.type.ts';
import { ApplicationLayout } from '#/shared/layouts/application/application-layout.component.tsx';
import { monthSearchSchema } from '#/shared/schemas/month-search.schema.ts';

// The selected month lives in the URL (`?month=YYYY-MM`) and holds for the whole app.
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  validateSearch: monthSearchSchema,
  component: ApplicationLayout,
});
