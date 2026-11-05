import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import {
  AmountField,
  ChoiceField,
  FineNote,
  FormModalGroup,
  FormModalMore,
  FormModalSplit,
  MoneyField,
  TextField,
  type IconName,
} from '@fincheck/ui';

import { AccountPreview } from '#/features/accounts/connect-account/components/account-preview.component.tsx';
import { BankSelect } from '#/features/accounts/connect-account/components/bank-select.component.tsx';
import { CardPreview } from '#/features/accounts/connect-account/components/card-preview.component.tsx';
import { ChoiceCards } from '#/features/accounts/connect-account/components/choice-cards.component.tsx';
import type {
  FormErrors,
  ManualAccountForm as ManualAccountFormValues,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

type Option<T extends string> = { value: T; label: string };

type ManualAccountFormProps = {
  form: ManualAccountFormValues;
  errors: FormErrors;
  onFieldChange: <K extends keyof ManualAccountFormValues>(
    key: K,
    value: ManualAccountFormValues[K],
  ) => void;
  typeOptions: readonly (Option<Account.Type> & { icon: IconName })[];
  institutionOptions: readonly Option<Institution.Code>[];
  brandOptions: readonly Option<CreditCard.Brand>[];
  /** Editing: the kind of account cannot change, and neither the opening balance. */
  isEditing: boolean;
  /** The bank comes from the Open Finance: it is shown but not changed. */
  isBankLocked: boolean;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** What the closed "Mais opções" of a card already holds ("Visa · final 1234"). */
function summarizeCardExtras(
  form: ManualAccountFormValues,
  brandOptions: readonly Option<CreditCard.Brand>[],
): string {
  const brand = brandOptions.find((option) => option.value === form.brand)?.label;
  return [
    brand,
    form.last4 ? `final ${form.last4}` : null,
    form.limitCents > 0 ? `limite ${formatMoney(form.limitCents)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The by-hand account: checking, savings, wallet or credit card (RF-ACC-003, BR-ACC-002). */
export function ManualAccountForm({
  form,
  errors,
  onFieldChange,
  typeOptions,
  institutionOptions,
  brandOptions,
  isEditing,
  isBankLocked,
}: ManualAccountFormProps) {
  const isCard = form.type === 'credit_card';
  const isWallet = form.type === 'wallet';
  const typeLabel = typeOptions.find((option) => option.value === form.type)?.label ?? '';
  const bankName =
    form.institutionCode === 'other'
      ? form.institutionName.trim()
      : (institutionOptions.find((option) => option.value === form.institutionCode)?.label ?? '');

  const preview = isCard ? (
    <CardPreview
      institutionCode={form.institutionCode}
      bankName={bankName}
      nickname={form.name}
      last4={form.last4}
      dueDay={form.dueDay}
    />
  ) : (
    <AccountPreview
      isWallet={isWallet}
      institutionCode={form.institutionCode}
      bankName={bankName}
      typeLabel={typeLabel}
      name={form.name}
      balanceCents={form.initialBalanceCents}
    />
  );

  return (
    <>
      <ChoiceCards
        label="Tipo de conta"
        options={typeOptions}
        value={form.type}
        onChange={(type) => onFieldChange('type', type)}
        columns={4}
        isDisabled={isEditing}
      />
      <div className="grid grid-cols-1 gap-s16 @sm:grid-cols-2">
        {isWallet ? null : (
          <BankSelect
            label="Banco"
            options={institutionOptions}
            value={form.institutionCode}
            onChange={(code) => onFieldChange('institutionCode', code)}
            error={errors['institutionCode']}
            isDisabled={isBankLocked}
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
        <TextField
          label={isCard ? 'Apelido do cartão' : 'Nome da conta'}
          value={form.name}
          onChange={(value) => onFieldChange('name', value)}
          error={errors['name']}
          placeholder={isCard ? 'Ex.: Roxinho' : 'Ex.: Conta do dia a dia'}
          maxLength={60}
          autoComplete="off"
          className={isWallet ? '@sm:col-span-2' : undefined}
        />
      </div>
      <FormModalSplit aside={preview}>
        {isCard ? (
          <>
            <FormModalGroup>
              <div className="grid grid-cols-2 gap-s12">
                <TextField
                  label="Dia de fechamento"
                  value={form.closingDay}
                  onChange={(value) => onFieldChange('closingDay', digitsOnly(value))}
                  error={errors['creditCard.closingDay']}
                  placeholder="Ex.: 25"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                />
                <TextField
                  label="Dia de vencimento"
                  value={form.dueDay}
                  onChange={(value) => onFieldChange('dueDay', digitsOnly(value))}
                  error={errors['creditCard.dueDay']}
                  placeholder="Ex.: 6"
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                />
              </div>
            </FormModalGroup>
            <FormModalMore
              summary={summarizeCardExtras(form, brandOptions)}
              hasError={Boolean(errors['creditCard.last4'] || errors['creditCard.limitCents'])}
            >
              <ChoiceField
                label="Bandeira"
                options={brandOptions.map((option) => ({ key: option.value, label: option.label }))}
                value={form.brand}
                onChange={(brand) => onFieldChange('brand', brand as CreditCard.Brand)}
              />
              <TextField
                label="Final do cartão"
                value={form.last4}
                onChange={(value) => onFieldChange('last4', digitsOnly(value))}
                error={errors['creditCard.last4']}
                placeholder="Os 4 últimos dígitos"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
              />
              <MoneyField
                label="Limite"
                cents={form.limitCents}
                onChange={(cents) => onFieldChange('limitCents', cents)}
                error={errors['creditCard.limitCents']}
              />
            </FormModalMore>
          </>
        ) : isEditing ? (
          <FineNote icon="edit">
            Para mudar o saldo, use &quot;Ajustar saldo&quot; no cartão da conta.
          </FineNote>
        ) : (
          <FormModalGroup label="Saldo de hoje">
            <AmountField
              kind="income"
              label="Saldo inicial"
              cents={form.initialBalanceCents}
              onChange={(cents) => onFieldChange('initialBalanceCents', cents)}
              error={errors['initialBalanceCents']}
            />
          </FormModalGroup>
        )}
      </FormModalSplit>
    </>
  );
}
