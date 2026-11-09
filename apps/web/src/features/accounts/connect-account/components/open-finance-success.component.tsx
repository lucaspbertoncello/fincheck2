import { Button, Icon } from '@fincheck/ui';

type OpenFinanceSuccessProps = {
  onConnectAnother: () => void;
};

/** The bank is connected: what shows up now and what keeps happening by itself. */
export function OpenFinanceSuccess({ onConnectAnother }: OpenFinanceSuccessProps) {
  return (
    <div role="status" className="flex flex-col items-start gap-s16 py-s8">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-capsule bg-gain-weak text-gain"
      >
        <Icon name="check" size="lg" />
      </span>
      <div className="flex flex-col gap-s4">
        <p className="font-title text-body font-emphasis text-fg-primary">Banco conectado</p>
        <p className="text-label text-fg-secondary">
          As contas e os cartões do banco aparecem em Contas e cartões quando a primeira busca
          terminar. Saldo e transações se atualizam sozinhos, algumas vezes por dia.
        </p>
        <p className="text-meta text-fg-secondary">
          A primeira busca traz o histórico. O app segue usável enquanto ele chega.
        </p>
      </div>
      <Button variant="secondary" icon="plug" onPress={onConnectAnother}>
        Conectar outro banco
      </Button>
    </div>
  );
}
