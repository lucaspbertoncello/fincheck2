import {
  Banner,
  FineNote,
  FormModalGroup,
  FormModalSplit,
  Skeleton,
  Steps,
  TextField,
} from '@fincheck/ui';
import type { StepItem } from '@fincheck/ui';

const ITEM_ID_LENGTH = 36;

type PluggyItemFormProps = {
  isLoading: boolean;
  isConfigured: boolean;
  itemId: string;
  onItemIdChange: (value: string) => void;
  error?: string;
  onOpenSettings: () => void;
};

function buildSteps(itemId: string): StepItem[] {
  const typed = itemId.trim().length;
  const done = typed === ITEM_ID_LENGTH;
  const started = typed > 0;

  return [
    {
      key: 'connect',
      title: 'Conecte o banco no Meu Pluggy',
      description: 'No site do Pluggy, com o login do seu banco.',
      status: started ? 'done' : 'current',
    },
    {
      key: 'copy',
      title: 'Copie o ID do item',
      description: 'São 36 letras e números, na página do banco conectado.',
      status: started ? 'done' : 'todo',
    },
    {
      key: 'paste',
      title: 'Cole o ID aqui',
      description: 'O Fincheck busca o que o Pluggy já tem.',
      status: done ? 'done' : started ? 'current' : 'todo',
    },
  ];
}

/** "Meu Pluggy" way of connecting a bank: three steps and the field for the item id (the Pluggy widget needs a library the app does not have). */
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
    <FormModalSplit
      aside={
        <FormModalGroup label="Como pegar o ID">
          <Steps label="Passos para conectar pelo Meu Pluggy" items={buildSteps(itemId)} />
        </FormModalGroup>
      }
    >
      <FormModalGroup label="O ID do item">
        <TextField
          label="ID do item no Meu Pluggy"
          value={itemId}
          onChange={onItemIdChange}
          error={error}
          placeholder="Cole aqui os 36 caracteres"
          autoComplete="off"
          maxLength={ITEM_ID_LENGTH}
          autoFocus
        />
        <FineNote icon="sync">
          Depois de conectar, o Fincheck busca de hora em hora. O histórico vem na primeira busca e
          o app segue usável.
        </FineNote>
      </FormModalGroup>
    </FormModalSplit>
  );
}
