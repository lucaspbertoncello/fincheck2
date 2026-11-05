import { EmptyState } from '@fincheck/ui';

/** "Nenhuma assinatura ainda": the way out is to register one (or wait for a suggestion). */
export function SubscriptionListEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon="subscription"
      title="Nenhuma assinatura ainda"
      description="Cadastre uma cobrança fixa do cartão. Compras que se repetem todo mês aparecem aqui como sugestão."
      primaryAction={{ label: 'Cadastrar assinatura', icon: 'subscription', onPress: onCreate }}
    />
  );
}
