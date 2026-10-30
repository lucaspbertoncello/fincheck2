import { EmptyState } from '#/components/states/empty-state.component.tsx';

type ErrorStateProps = {
  /** "Não deu para carregar as contas". */
  title: string;
  /** One sentence on what to do or what happened. */
  description?: string;
  /** Runs the request again. */
  onRetry: () => void;
  /** Text of the retry button. */
  retryLabel?: string;
  /** Heading level of the title, to fit the page outline. */
  headingLevel?: 2 | 3;
  className?: string;
};

/** Error state of a screen or block (components.md 14): the empty state with a warning and "Tentar de novo". */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Tentar de novo',
  headingLevel,
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon="warning"
      title={title}
      description={description}
      primaryAction={{ label: retryLabel, onPress: onRetry }}
      headingLevel={headingLevel}
      className={className}
    />
  );
}
