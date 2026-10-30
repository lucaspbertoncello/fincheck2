import { Banner } from '@fincheck/ui';

type SectionErrorProps = {
  /** What failed to load, in the title ("o gasto do mês"). */
  what: string;
  onRetry: () => void;
};

/** A block that could not load: says which one and offers "Tentar de novo". */
export function SectionError({ what, onRetry }: SectionErrorProps) {
  return (
    <Banner
      variant="error"
      title={`Não deu para carregar ${what}`}
      description="Confira se a API está no ar e tente de novo."
      actionLabel="Tentar de novo"
      onAction={onRetry}
    />
  );
}
