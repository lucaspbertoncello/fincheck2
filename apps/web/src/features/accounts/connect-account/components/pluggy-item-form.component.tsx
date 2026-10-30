import { Banner, FineNote, Skeleton, TextField } from '@fincheck/ui';

type PluggyItemFormProps = {
  isLoading: boolean;
  isConfigured: boolean;
  itemId: string;
  onItemIdChange: (value: string) => void;
  error?: string;
  onOpenSettings: () => void;
};

/** "Meu Pluggy" way of connecting a bank: paste the item id (the Pluggy widget needs a library the app does not have). */
export function PluggyItemForm({
  isLoading,
  isConfigured,
  itemId,
  onItemIdChange,
  error,
  onOpenSettings,
}: PluggyItemFormProps) {
  if (isLoading) return <Skeleton className="h-ctl-touch w-full" />;

  if (!isConfigured) {
    return (
      <Banner
        variant="warning"
        title="Falta configurar o Pluggy"
        description="Salve o Client ID e o Secret do Pluggy em Configurações para conectar um banco."
        actionLabel="Abrir Configurações"
        onAction={onOpenSettings}
      />
    );
  }

  return (
    <div className="flex flex-col gap-s16">
      <TextField
        label="ID do item no Meu Pluggy"
        value={itemId}
        onChange={onItemIdChange}
        error={error}
        description="Conecte o banco no Meu Pluggy e copie o ID do item, com 36 caracteres."
        autoComplete="off"
        maxLength={36}
        autoFocus
      />
      <FineNote icon="sync">
        O Fincheck busca o que o Pluggy já tem, de hora em hora. O histórico vem na primeira busca e
        o app segue usável.
      </FineNote>
    </div>
  );
}
