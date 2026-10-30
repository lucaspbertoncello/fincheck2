import { EmptyState } from '@fincheck/ui';

/** The month could not be loaded: says so and offers "Tentar de novo". */
export function RecurrenceListError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon="danger"
      title="Não deu para carregar as recorrências"
      description="Confira se a API está no ar e tente de novo."
      primaryAction={{ label: 'Tentar de novo', icon: 'sync', onPress: onRetry }}
    />
  );
}
