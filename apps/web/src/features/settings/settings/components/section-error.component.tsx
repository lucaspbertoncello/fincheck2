import { Button, FineNote } from '@fincheck/ui';

type SectionErrorProps = {
  /** "Não deu para carregar as conexões." */
  message: string;
  onRetry: () => void;
};

/** Error state of one section: the sentence and "Tentar de novo". */
export function SectionError({ message, onRetry }: SectionErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-s12">
      <FineNote icon="warning">{message}</FineNote>
      <Button variant="secondary" size="sm" icon="sync" onPress={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}
