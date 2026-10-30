import {
  Button,
  CategoryChoices,
  EditDateField,
  FineNote,
  Modal,
  MoneyField,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import type { BillCreateViewProps } from '#/features/bills/bill-create/bill-create.model.ts';

const DIRECTIONS = [
  { key: 'payable', label: 'A pagar' },
  { key: 'receivable', label: 'A receber' },
];

export function BillCreateView({
  formRef,
  isOpen,
  onClose,
  direction,
  onDirectionChange,
  amountCents,
  onAmountChange,
  description,
  onDescriptionChange,
  dueOn,
  onDueOnChange,
  categories,
  categoryId,
  onCategoryChange,
  errors,
  dueDateText,
  submitError,
  isSaving,
  onSubmit,
}: BillCreateViewProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSaving}
      title="Nova conta a pagar ou receber"
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
            Cancelar
          </Button>
          <Button form="bill-create-form" type="submit" loading={isSaving}>
            Salvar conta
          </Button>
        </>
      }
    >
      <form
        id="bill-create-form"
        ref={formRef}
        noValidate
        className="flex flex-col gap-s16"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <SegmentedControl
          label="Tipo da conta"
          options={DIRECTIONS}
          value={direction}
          onChange={(key) => onDirectionChange(key === 'receivable' ? 'receivable' : 'payable')}
        />
        <MoneyField
          label="Valor"
          size="large"
          cents={amountCents}
          onChange={onAmountChange}
          error={errors.amountCents}
          autoFocus
        />
        <TextField
          label="Descrição"
          value={description}
          onChange={onDescriptionChange}
          error={errors.description}
          placeholder="IPTU, parcela 3"
          maxLength={120}
          autoComplete="off"
        />
        <EditDateField
          label="Vence em (opcional)"
          value={dueOn}
          onChange={onDueOnChange}
          error={errors.dueOn}
        />
        <CategoryChoices
          label="Categoria (opcional)"
          categories={categories}
          value={categoryId}
          onChange={onCategoryChange}
          error={errors.categoryId}
        />
        <FineNote icon="calendar">
          {dueDateText
            ? `Entra em A pagar e receber e no "${direction === 'payable' ? 'A pagar' : 'A receber'}" do Livre até ${dueDateText}. Para repetir todo mês, use uma recorrência.`
            : 'Sem vencimento, a conta fica em "Sem data" e fora do Livre. Para repetir todo mês, use uma recorrência.'}
        </FineNote>
        {submitError ? (
          <p role="alert" className="text-label text-loss">
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
