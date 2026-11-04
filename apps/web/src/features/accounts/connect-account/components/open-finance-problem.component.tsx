import { Banner, Button } from '@fincheck/ui';

type OpenFinanceProblemProps = {
  variant: 'warning' | 'error';
  title: string;
  description?: string;
  /** The way out that fits: try again, or save the keys in Configurações. */
  actionLabel: string;
  onAction: () => void;
  /** The other way out: the account typed by hand. */
  onUseManual: () => void;
};

/** A problem with the connection (no keys, or the connect failed), always with two ways out. */
export function OpenFinanceProblem({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  onUseManual,
}: OpenFinanceProblemProps) {
  return (
    <div className="flex flex-col gap-s12">
      <Banner
        variant={variant}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onAction}
      />
      <Button variant="tertiary" icon="edit" onPress={onUseManual} className="self-start">
        Criar conta manual
      </Button>
    </div>
  );
}
