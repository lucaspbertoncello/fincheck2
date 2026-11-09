// Tables that every Fincheck database has since its first migrations, whatever its version. A file
// without them is not one of ours.
export const FINCHECK_CORE_TABLES = [
  'kysely_migration',
  'categories',
  'tags',
  'accounts',
  'credit_cards',
] as const;
