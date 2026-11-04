import { FormModalGroup, Icon, type IconName } from '@fincheck/ui';

const OUTCOMES: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'card',
    title: 'Contas e cartões do banco, juntos',
    text: 'Com saldo e transações. Aparecem em Contas e cartões.',
  },
  {
    icon: 'sync',
    title: 'Atualiza sozinho',
    text: 'Algumas vezes por dia. A tela mostra a hora da última atualização.',
  },
  {
    icon: 'history',
    title: 'Histórico na primeira busca',
    text: 'O app segue usável enquanto ele chega.',
  },
  {
    icon: 'warning',
    title: 'Fatura aberta do cartão',
    text: 'Pode só aparecer depois que o banco a fechar.',
  },
];

/** What the person gets by connecting a bank, and what to expect after it: the answer to "o que acontece?". */
export function OpenFinanceOutcome() {
  return (
    <FormModalGroup label="O que acontece depois">
      <ul className="flex flex-col gap-s12">
        {OUTCOMES.map((item) => (
          <li key={item.title} className="flex items-start gap-s12">
            <span
              aria-hidden="true"
              className="grid size-ctl-sm shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary"
            >
              <Icon name={item.icon} size="md" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-label font-emphasis text-fg-primary">{item.title}</span>
              <span className="text-meta text-fg-secondary">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </FormModalGroup>
  );
}
