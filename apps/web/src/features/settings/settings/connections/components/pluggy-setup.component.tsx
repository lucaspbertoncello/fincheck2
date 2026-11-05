import { Button, Steps, TextField, type StepItem } from '@fincheck/ui';
import { Link } from 'react-aria-components';

import type { PluggySetupProps } from '#/features/settings/settings/connections/types/pluggy-setup-props.type.ts';
import { MEU_PLUGGY_URL } from '#/features/settings/settings/connections/constants/meu-pluggy-url.constant.ts';

const SETUP_STEPS: StepItem[] = [
  {
    key: 'account',
    status: 'current',
    title: 'Crie seu acesso ao Open Finance',
    description: 'No site do Open Finance, com o mesmo e-mail dos bancos.',
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
      <div className="flex flex-col gap-s12">
        <Steps items={SETUP_STEPS} label="Passos para conectar o Open Finance" />
        <Link
          href={MEU_PLUGGY_URL}
          target="_blank"
          rel="noreferrer"
          className="focus-ring cursor-pointer self-start rounded-tiny text-label font-emphasis text-brand underline underline-offset-2 data-[hovered]:no-underline"
        >
          Abrir o site do Open Finance
        </Link>
      </div>
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
