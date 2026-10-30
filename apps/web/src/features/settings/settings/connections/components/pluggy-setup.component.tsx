import { Button, Steps, TextField, type StepItem } from '@fincheck/ui';

const SETUP_STEPS: StepItem[] = [
  {
    key: 'account',
    status: 'current',
    title: 'Crie a conta no Pluggy',
    description: 'Em meu.pluggy.ai, com o mesmo e-mail dos bancos.',
  },
  {
    key: 'keys',
    status: 'todo',
    title: 'Cole o Client ID e o Client Secret',
    description: 'Ficam criptografados neste PC.',
  },
  { key: 'banks', status: 'todo', title: 'Conecte os bancos' },
  { key: 'history', status: 'todo', title: 'Busque o histórico' },
];

export type PluggySetupProps = {
  clientId: string;
  clientSecret: string;
  errors: { clientId?: string; clientSecret?: string };
  isSaving: boolean;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onSubmit: () => void;
};

/** First configuration of the Open Finance: the four steps and the form of the two keys. */
export function PluggySetup({
  clientId,
  clientSecret,
  errors,
  isSaving,
  onClientIdChange,
  onClientSecretChange,
  onSubmit,
}: PluggySetupProps) {
  return (
    <div className="flex flex-col gap-s24">
      <Steps items={SETUP_STEPS} label="Passos para conectar o Open Finance" />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-s16"
      >
        <TextField
          label="Client ID"
          value={clientId}
          onChange={onClientIdChange}
          error={errors.clientId}
          autoComplete="off"
          maxLength={100}
        />
        <TextField
          label="Client Secret"
          type="password"
          value={clientSecret}
          onChange={onClientSecretChange}
          error={errors.clientSecret}
          autoComplete="off"
          maxLength={200}
        />
        <div>
          <Button type="submit" loading={isSaving}>
            Guardar as chaves
          </Button>
        </div>
      </form>
    </div>
  );
}
