import { Banner } from '@fincheck/ui';

type LoadFailedProps = {
  onRetry: () => void;
};

/** The list could not load: what happened and "Tentar de novo". */
export function LoadFailed({ onRetry }: LoadFailedProps) {
  return (
    <Banner
      variant="error"
      title="Não deu para carregar as transações"
      description="A API não respondeu como esperado. Seus dados não foram alterados."
      actionLabel="Tentar de novo"
      onAction={onRetry}
    />
  );
}
