import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';

// Categories and tags: the defaults, one made by Lucas and one archived of each.
export function seedCatalog(database: MockState.Database, ids: SeedIds): void {
  const { cat } = ids;
  const archivedAt = toInstant(addDays(TODAY, -90));

  database.categories.push(
    {
      id: cat.mercado,
      kind: 'expense',
      name: 'Mercado',
      icon: 'cart',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.restaurantes,
      kind: 'expense',
      name: 'Restaurantes',
      icon: 'food',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.delivery,
      kind: 'expense',
      name: 'Delivery',
      icon: 'deliv',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.transporte,
      kind: 'expense',
      name: 'Transporte',
      icon: 'car',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.moradia,
      kind: 'expense',
      name: 'Moradia',
      icon: 'house',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.saude,
      kind: 'expense',
      name: 'Saúde',
      icon: 'health',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.lazer,
      kind: 'expense',
      name: 'Lazer',
      icon: 'fun',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.assinaturas,
      kind: 'expense',
      name: 'Assinaturas',
      icon: 'subs',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.educacao,
      kind: 'expense',
      name: 'Educação',
      icon: 'book',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.compras,
      kind: 'expense',
      name: 'Compras',
      icon: 'shirt',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.pets,
      kind: 'expense',
      name: 'Pets',
      icon: 'pet',
      isDefault: false,
      archivedAt: null,
    },
    {
      id: cat.viagensAntigas,
      kind: 'expense',
      name: 'Viagem de 2025',
      icon: 'plane',
      isDefault: false,
      archivedAt,
    },
    {
      id: cat.outros,
      kind: 'expense',
      name: 'Outros',
      icon: 'tag',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.salario,
      kind: 'income',
      name: 'Salário',
      icon: 'salary',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.freelance,
      kind: 'income',
      name: 'Freelance',
      icon: 'coins',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.mesada,
      kind: 'income',
      name: 'Mesada',
      icon: 'handmoney',
      isDefault: false,
      archivedAt: null,
    },
    {
      id: cat.beneficio,
      kind: 'income',
      name: 'Benefícios',
      icon: 'wallet',
      isDefault: true,
      archivedAt: null,
    },
    {
      id: cat.outrasReceitas,
      kind: 'income',
      name: 'Outras receitas',
      icon: 'dollar',
      isDefault: true,
      archivedAt: null,
    },
  );

  database.tags.push(
    { id: ids.tag.viagem, name: 'viagem', archivedAt: null },
    { id: ids.tag.trabalho, name: 'trabalho', archivedAt: null },
    { id: ids.tag.delivery, name: 'delivery', archivedAt: null },
    { id: ids.tag.presente, name: 'presente', archivedAt },
  );
}
