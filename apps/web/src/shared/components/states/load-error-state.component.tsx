import { ErrorState } from '@fincheck/ui';

type LoadErrorStateProps = {
  /** What failed to load, in the title ("as recorrências"). */
  what: string;
  onRetry: () => void;
};

/** A list that could not be loaded: says which one and offers "Tentar de novo". */
export function LoadErrorState({ what, onRetry }: LoadErrorStateProps) {
  return (
    <ErrorState
      title={`Não deu para carregar ${what}`}
      description="Confira se a API está no ar e tente de novo."
      onRetry={onRetry}
    />
  );
}
