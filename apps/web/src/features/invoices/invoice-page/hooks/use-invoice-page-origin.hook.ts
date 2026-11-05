import { useSearch } from '@tanstack/react-router';
import { z } from 'zod';

const originSchema = z.enum(['accounts', 'bills']).catch('accounts');

/**
 * Where the person came from (`?from=accounts` or `?from=bills`), so "voltar" leads back there.
 * A missing or unknown value is Contas e cartões.
 */
export function useInvoicePageOrigin() {
  const search: { from?: unknown } = useSearch({ strict: false });

  return originSchema.parse(search.from);
}
