import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type RuleSuggestionBannerProps = {
  /** "Você moveu 3 transações “UBER *TRIP” para Transporte. A regra faz isso sozinha...". */
  message: string;
  /** Opens the editor already filled. */
  onCreate: () => void;
  actionLabel?: string;
  className?: string;
};

/** Suggestion banner (components.md 9.3): weak accent box, the sentence and "Criar regra". */
export function RuleSuggestionBanner({
  message,
  onCreate,
  actionLabel = 'Criar regra',
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
      <Button onPress={onCreate} className="self-end lg:self-auto">
        {actionLabel}
      </Button>
    </div>
  );
}
