import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type RuleSuggestionBannerProps = {
  /** "Você moveu 3 transações “UBER *TRIP” para Transporte. A regra faz isso sozinha...". */
  message: string;
  /** Opens the editor already filled. */
  onCreate: () => void;
  actionLabel?: string;
  /** "Agora não": hides the suggestion. Without it the banner has only the create action. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

/** Suggestion banner (components.md 9.3): weak accent box, the sentence, "Agora não" and "Criar regra". */
export function RuleSuggestionBanner({
  message,
  onCreate,
  actionLabel = 'Criar regra',
  onDismiss,
  dismissLabel = 'Agora não',
  className,
}: RuleSuggestionBannerProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-col gap-s12 rounded-panel bg-brand-weak p-s16 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <p className="flex items-start gap-s12 text-body text-fg-primary">
        <Icon name="magic" size="base" className="mt-s4 text-brand" />
        <span>{message}</span>
      </p>
      <div className="flex items-center gap-s8 self-end lg:self-auto">
        {onDismiss ? (
          <Button variant="tertiary" onPress={onDismiss}>
            {dismissLabel}
          </Button>
        ) : null}
        <Button onPress={onCreate}>{actionLabel}</Button>
      </div>
    </div>
  );
}
