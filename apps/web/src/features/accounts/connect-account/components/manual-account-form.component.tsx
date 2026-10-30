import { ChoiceChip, MoneyField, TextField } from '@fincheck/ui';
import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

import type {
  FormErrors,
  ManualAccountForm as ManualAccountFormValues,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';

type Option<T extends string> = { value: T; label: string };

type ManualAccountFormProps = {
  form: ManualAccountFormValues;
  errors: FormErrors;
  onFieldChange: <K extends keyof ManualAccountFormValues>(
    key: K,
    value: ManualAccountFormValues[K],
  ) => void;
  typeOptions: readonly Option<Account.Type>[];
  institutionOptions: readonly Option<Institution.Code>[];
  brandOptions: readonly Option<CreditCard.Brand>[];
};

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-s8">
      <span className="text-label font-emphasis text-fg-primary">{label}</span>
      <div className="flex flex-wrap gap-s8">
        {options.map((option) => (
          <ChoiceChip
            key={option.value}
            selected={value === option.value}
            onChange={() => onChange(option.value)}
          >
            {option.label}
          </ChoiceChip>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-meta text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The by-hand account: checking, savings, wallet or credit card (RF-ACC-003, BR-ACC-002). */
export function ManualAccountForm({
  form,
  errors,
  onFieldChange,
  typeOptions,
  institutionOptions,
  brandOptions,
}: ManualAccountFormProps) {
  const isCard = form.type === 'credit_card';
  const isWallet = form.type === 'wallet';

  return (
    <div className="flex flex-col gap-s16">
      <ChipGroup
        label="Tipo de conta"
        options={typeOptions}
        value={form.type}
        onChange={(type) => onFieldChange('type', type)}
      />
      <TextField
        label={isCard ? 'Apelido do cartão' : 'Nome da conta'}
        value={form.name}
        onChange={(value) => onFieldChange('name', value)}
        error={errors['name']}
        maxLength={60}
        autoComplete="off"
      />
      {isWallet ? null : (
        <ChipGroup
          label="Banco"
          options={institutionOptions}
          value={form.institutionCode}
          onChange={(code) => onFieldChange('institutionCode', code)}
          error={errors['institutionCode']}
        />
      )}
      {!isWallet && form.institutionCode === 'other' ? (
        <TextField
          label="Nome do banco"
          value={form.institutionName}
          onChange={(value) => onFieldChange('institutionName', value)}
          error={errors['institutionName']}
          maxLength={60}
          autoComplete="off"
        />
      ) : null}

      {isCard ? (
        <>
          <ChipGroup
            label="Bandeira"
            options={brandOptions}
            value={form.brand}
            onChange={(brand) => onFieldChange('brand', brand)}
          />
          <TextField
            label="Final do cartão (opcional)"
            value={form.last4}
            onChange={(value) => onFieldChange('last4', value.replace(/\D/g, ''))}
            error={errors['creditCard.last4']}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-s16">
            <TextField
              label="Dia de fechamento"
              value={form.closingDay}
              onChange={(value) => onFieldChange('closingDay', value.replace(/\D/g, ''))}
              error={errors['creditCard.closingDay']}
              inputMode="numeric"
              maxLength={2}
              autoComplete="off"
            />
            <TextField
              label="Dia de vencimento"
              value={form.dueDay}
              onChange={(value) => onFieldChange('dueDay', value.replace(/\D/g, ''))}
              error={errors['creditCard.dueDay']}
              inputMode="numeric"
              maxLength={2}
              autoComplete="off"
            />
          </div>
          <MoneyField
            label="Limite (opcional)"
            cents={form.limitCents}
            onChange={(cents) => onFieldChange('limitCents', cents)}
            error={errors['creditCard.limitCents']}
          />
        </>
      ) : (
        <MoneyField
          label="Saldo inicial"
          cents={form.initialBalanceCents}
          onChange={(cents) => onFieldChange('initialBalanceCents', cents)}
          error={errors['initialBalanceCents']}
          description="O saldo de hoje. Depois você ajusta quando quiser."
        />
      )}
    </div>
  );
}
