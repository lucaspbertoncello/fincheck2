import { ErrorState } from '@fincheck/ui';

/** The month could not be loaded: says so and offers "Tentar de novo". */
export function SubscriptionListError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Não deu para carregar as assinaturas"
      description="Confira se a API está no ar e tente de novo."
      onRetry={onRetry}
    />
  );
}
