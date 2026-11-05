import { createRoute } from '@tanstack/react-router';

import { InvoicePage } from '#/pages/invoices/invoice.page.tsx';
import { rootRoute } from '#/router/routes/root.route.tsx';

/** `/cards/:accountId/invoices/:month`: the invoice of a card, by the month of its closing. */
export const invoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cards/$accountId/invoices/$month',
  component: InvoicePage,
});
