import { Button, RulePreview, Skeleton, type RulePreviewData } from '@fincheck/ui';

export type RulePreviewStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

type RulePreviewAreaProps = {
  status: RulePreviewStatus;
  preview: RulePreviewData | undefined;
  onRetry: () => void;
};

const BOX_CLASS = 'rounded-input bg-subtle p-s16 text-label text-fg-secondary';

/** The history box of the rule modal in each state: nothing typed yet, loading, error, no match, matches. */
export function RulePreviewArea({ status, preview, onRetry }: RulePreviewAreaProps) {
  if (status === 'ready' && preview) return <RulePreview preview={preview} />;

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex flex-col gap-s8 rounded-input bg-subtle p-s16"
      >
        <span className="sr-only">Conferindo o histórico</span>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className={`${BOX_CLASS} flex flex-col items-start gap-s8`}>
        <p>Não deu para conferir o histórico agora.</p>
        <Button variant="secondary" size="sm" onPress={onRetry}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (status === 'empty') {
    return <p className={BOX_CLASS}>Nenhuma transação do histórico bate com essa regra ainda.</p>;
  }

  return <p className={BOX_CLASS}>Preencha a condição para ver o que a regra pega no histórico.</p>;
}
