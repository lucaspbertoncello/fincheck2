import { Button, ChoiceChip, Modal, Switch } from '@fincheck/ui';

import type { FiltersView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type FiltersModalProps = {
  filters: FiltersView;
};

type ChipGroupProps = {
  label: string;
  items: { id: string; name: string }[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
};

function ChipGroup({ label, items, value, onChange }: ChipGroupProps) {
  if (items.length === 0) return null;

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-s8">
      <span className="text-label text-fg-secondary">{label}</span>
      <div className="flex flex-wrap gap-s8">
        {items.map((item) => (
          <ChoiceChip
            key={item.id}
            selected={item.id === value}
            onChange={(selected) => onChange(selected ? item.id : undefined)}
          >
            {item.name}
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}

/** "Filtros": account, category, tag and "sem categoria". */
export function FiltersModal({ filters }: FiltersModalProps) {
  return (
    <Modal
      isOpen={filters.isOpen}
      onOpenChange={filters.onOpenChange}
      title="Filtros"
      subtitle="Valem para o mês escolhido."
      size="wide"
      destructiveAction={
        filters.canClear ? (
          <Button variant="tertiary" danger onPress={filters.onClear}>
            Limpar filtros
          </Button>
        ) : undefined
      }
      actions={<Button onPress={() => filters.onOpenChange(false)}>Ver resultado</Button>}
    >
      <ChipGroup
        label="Conta"
        items={filters.accounts}
        value={filters.accountId}
        onChange={filters.onAccountChange}
      />
      <div role="group" aria-label="Categoria" className="flex flex-col gap-s8">
        <span className="text-label text-fg-secondary">Categoria</span>
        <div className="flex flex-wrap gap-s8">
          {filters.categories.map((category) => (
            <ChoiceChip
              key={category.id}
              icon={category.icon}
              selected={category.id === filters.categoryId}
              onChange={(selected) => filters.onCategoryChange(selected ? category.id : undefined)}
            >
              {category.name}
            </ChoiceChip>
          ))}
        </div>
      </div>
      <ChipGroup
        label="Tag"
        items={filters.tags}
        value={filters.tagId}
        onChange={filters.onTagChange}
      />
      <Switch
        isSelected={filters.uncategorized}
        onChange={filters.onUncategorizedChange}
        label="Só as sem categoria"
        isDisabled={filters.categoryId !== undefined}
      />
    </Modal>
  );
}
