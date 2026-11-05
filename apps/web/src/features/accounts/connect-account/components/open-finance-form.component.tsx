import {
  FormModalGroup,
  FormModalSplit,
  Icon,
  Skeleton,
  Steps,
  TextField,
  type StepItem,
} from '@fincheck/ui';

import { OpenFinanceOutcome } from '#/features/accounts/connect-account/components/open-finance-outcome.component.tsx';
import { OpenFinanceProblem } from '#/features/accounts/connect-account/components/open-finance-problem.component.tsx';
import { StackedPanels } from '#/features/accounts/connect-account/components/stacked-panels.component.tsx';
import {
  CONNECTION_CODE_LENGTH,
  OPEN_FINANCE_SITE_URL,
} from '#/features/accounts/connect-account/constants/connect-modes.constant.ts';

export type OpenFinanceProblemContent = {
  variant: 'warning' | 'error';
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
};

type OpenFinanceFormProps = {
  /** Waiting for the saved keys. */
  isLoading: boolean;
  /** Only the variant on show may take the focus when it mounts (the others are out of the layout flow). */
  isActive: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  /** The connect is running: the field waits and a line says what is happening. */
  isConnecting: boolean;
  /** No keys, or the connect failed: replaces the steps with the reason and the ways out. */
  problem: OpenFinanceProblemContent | null;
  onUseManual: () => void;
};

function buildSteps(code: string): StepItem[] {
  const typed = code.trim().length;
  const done = typed === CONNECTION_CODE_LENGTH;
  const started = typed > 0;

  return [
    {
      key: 'connect',
      title: 'Conecte seu banco no Open Finance',
      description: 'No site do Open Finance, com o login do banco.',
      status: started ? 'done' : 'current',
    },
    {
      key: 'copy',
      title: 'Copie o código da conexão',
      description: '36 letras e números (o ID do item), na página do banco conectado.',
      status: started ? 'done' : 'todo',
    },
    {
      key: 'paste',
      title: 'Cole o código aqui',
      description: 'O fincheck busca as contas e os cartões desse banco.',
      status: done ? 'done' : started ? 'current' : 'todo',
    },
  ];
}

/**
 * The bank through the Open Finance: what happens after (aside), and how to connect (steps, the
 * link to the site and the field for the connection code). The code is pasted from the site because
 * the connect widget needs a library and an HTTPS redirect the app does not have yet. The guide and
 * the problem share one cell, so showing the problem never resizes the modal.
 */
export function OpenFinanceForm({
  isLoading,
  isActive,
  code,
  onCodeChange,
  error,
  isConnecting,
  problem,
  onUseManual,
}: OpenFinanceFormProps) {
  const active = isLoading ? 'loading' : problem ? 'problem' : 'guide';

  return (
    <FormModalSplit aside={<OpenFinanceOutcome />}>
      <StackedPanels
        active={active}
        panels={{
          guide: isLoading ? null : (
            <FormModalGroup label="Como conectar">
              <Steps label="Passos para conectar pelo Open Finance" items={buildSteps(code)} />
              <a
                href={OPEN_FINANCE_SITE_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center gap-s8 self-start rounded-tiny text-label font-emphasis whitespace-nowrap text-brand underline underline-offset-2 hover:no-underline"
              >
                <Icon name="link" size="sm" />
                Abrir o site do Open Finance
              </a>
              <TextField
                label="Código da conexão"
                value={code}
                onChange={onCodeChange}
                error={error}
                placeholder="Cole aqui os 36 caracteres"
                autoComplete="off"
                maxLength={CONNECTION_CODE_LENGTH}
                isDisabled={isConnecting}
                autoFocus={isActive}
              />
              <p
                role="status"
                aria-live="polite"
                className="flex min-h-5 items-center gap-s8 text-meta text-fg-secondary"
              >
                {isConnecting ? (
                  <>
                    <Icon name="sync" size="sm" className="animate-spin" />
                    Conectando ao banco e buscando contas e cartões...
                  </>
                ) : null}
              </p>
            </FormModalGroup>
          ),
          problem: problem ? <OpenFinanceProblem {...problem} onUseManual={onUseManual} /> : null,
          loading: isLoading ? <Skeleton className="h-ctl-touch w-full" /> : null,
        }}
      />
    </FormModalSplit>
  );
}
