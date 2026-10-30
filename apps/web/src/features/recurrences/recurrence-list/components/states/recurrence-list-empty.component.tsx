import { EmptyState } from '@fincheck/ui';

/** "Nenhuma recorrência ainda" (screens.md, `recurrences empty`). */
export function RecurrenceListEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon="repeat"
      title="Nenhuma recorrência ainda"
      description="Cadastre o que entra e sai todo mês, como salário, mesada e assinaturas."
      primaryAction={{ label: 'Cadastrar recorrência', icon: 'repeat', onPress: onCreate }}
    />
  );
}
