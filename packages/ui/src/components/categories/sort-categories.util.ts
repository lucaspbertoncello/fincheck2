import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';

/** Alphabetical order in Portuguese, ignoring accents and case; returns a new array. */
export function sortCategories(categories: ManagedCategory[]): ManagedCategory[] {
  return [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
}
