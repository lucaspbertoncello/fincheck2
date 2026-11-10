import {
  Banner,
  BannerSlot,
  Button,
  Collapse,
  ConfirmDialog,
  ContentSkeleton,
  EmptyState,
  Section,
} from '@fincheck/ui';
import { useId, useState } from 'react';

import { InstallmentPlanRow } from '#/features/transactions/installment-plans/components/installment-plan-row.component.tsx';
import type {
  InstallmentPlanRowData,
  InstallmentPlansViewProps,
} from '#/features/transactions/installment-plans/types/installment-plans.type.ts';
import { BackPageFrame } from '#/shared/components/page/back-page-frame.component.tsx';
import { LoadErrorState } from '#/shared/components/states/load-error-state.component.tsx';

type PlanListProps = {
  label: string;
  plans: readonly InstallmentPlanRowData[];
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
};

function PlanList({ label, plans, onEdit, onDelete }: PlanListProps) {
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col p-0">
      {plans.map((plan, index) => (
        <InstallmentPlanRow
          key={plan.id}
          plan={plan}
          first={index === 0}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

/** "Quitadas": folded by default, since there is nothing left to do with them. */
function SettledSection({ plans, onEdit, onDelete }: Omit<PlanListProps, 'label'>) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <Section
      title="Quitadas"
      action={
        <Button
          variant="tertiary"
          size="sm"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onPress={() => setIsOpen((current) => !current)}
        >
          {isOpen ? 'Ocultar' : `Mostrar (${plans.length})`}
        </Button>
      }
    >
      <Collapse isOpen={isOpen} id={panelId} trackClassName="-mt-s16" contentClassName="pt-s16">
        <PlanList
          label="Compras parceladas quitadas"
          plans={plans}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Collapse>
    </Section>
  );
}

/**
 * "Compras parceladas" of a card: the way back, the title with the card, "Nova compra parcelada" on
 * the title line, the plans in progress first and the settled ones folded below. Every state is
 * here (loading, error, a card that does not exist, no plan at all); everything arrives ready in
 * props.
 */
export function InstallmentPlansView(props: InstallmentPlansViewProps) {
  const { state, active, settled } = props;
  // The dialog fades out after the target is gone: it keeps the last one, so its text does not turn
  // into "As 0 parcelas" while it leaves.
  const [lastTarget, setLastTarget] = useState(props.deleteTarget);
  if (
    props.deleteTarget &&
    (props.deleteTarget.name !== lastTarget?.name ||
      props.deleteTarget.installmentCount !== lastTarget.installmentCount)
  ) {
    setLastTarget(props.deleteTarget);
  }
  const shownTarget = props.deleteTarget ?? lastTarget;
  const hasPlans = active.length + settled.length > 0;

  return (
    <BackPageFrame
      title={props.title}
      description={props.description}
      backHref={props.backHref}
      backLabel={props.backLabel}
      actions={
        state === 'ready' ? (
          <Button onPress={props.onCreate}>Nova compra parcelada</Button>
        ) : undefined
      }
    >
      {state === 'loading' ? <ContentSkeleton variant="list" /> : null}
      {state === 'error' ? (
        <LoadErrorState what="as compras parceladas" onRetry={props.onRetry} />
      ) : null}
      {state === 'not-found' ? (
        <EmptyState
          icon="card"
          title="Esse cartão não existe"
          description="O endereço está errado, ou o cartão foi apagado."
          primaryAction={{ label: `Voltar para ${props.backLabel}`, onPress: props.onBack }}
        />
      ) : null}
      {state === 'ready' ? (
        <div className="flex flex-col gap-s24">
          <BannerSlot isOpen={Boolean(props.actionError)}>
            {props.actionError ? (
              <Banner
                variant="error"
                title={props.actionError}
                actionLabel="Fechar"
                onAction={props.onDismissActionError}
              />
            ) : null}
          </BannerSlot>
          {hasPlans ? (
            <>
              <Section title="Em andamento" divider={false}>
                {active.length > 0 ? (
                  <PlanList
                    label="Compras parceladas em andamento"
                    plans={active}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                  />
                ) : (
                  <p className="text-body text-fg-secondary">
                    Nenhuma compra parcelada em andamento neste cartão.
                  </p>
                )}
              </Section>
              {settled.length > 0 ? (
                <SettledSection plans={settled} onEdit={props.onEdit} onDelete={props.onDelete} />
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="card"
              title="Nenhuma compra parcelada neste cartão"
              description="Lance uma compra para ver cada parcela na fatura certa."
              primaryAction={{ label: 'Nova compra parcelada', onPress: props.onCreate }}
            />
          )}
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={props.deleteTarget !== null}
        onOpenChange={(open) => !open && props.onCancelDelete()}
        destructive
        icon="trash"
        title="Excluir esta compra parcelada?"
        description={`As ${shownTarget?.installmentCount ?? 0} parcelas somem das faturas. Não dá para desfazer.`}
        confirmLabel="Excluir"
        onConfirm={props.onConfirmDelete}
        loading={props.deleting}
      />
    </BackPageFrame>
  );
}
