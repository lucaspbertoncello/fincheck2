import { Banner } from '#/components/feedback/index.ts';

type SyncErrorBannerProps = {
  /** Bank name: "Bradesco". */
  institution: string;
  /** Detail line: the reason and the times of the attempts. */
  detail?: string;
  /** Label of the button; "Tentar agora" by default. */
  actionLabel?: string;
  onRetry: () => void;
  /** The retry is running. */
  retrying?: boolean;
  className?: string;
};

/**
 * Sync error at the top of the affected screen's content (components.md 14.3, screens.md
 * `sync error`): "Não deu para sincronizar o Bradesco", the attempts and "Tentar agora".
 */
export function SyncErrorBanner({
  institution,
  detail,
  actionLabel = 'Tentar agora',
  onRetry,
  retrying = false,
  className,
}: SyncErrorBannerProps) {
  return (
    <Banner
      variant="error"
      title={`Não deu para sincronizar o ${institution}`}
      description={detail}
      actionLabel={actionLabel}
      onAction={onRetry}
      actionLoading={retrying}
      className={className}
    />
  );
}
