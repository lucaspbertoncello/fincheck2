import type {
  RecurrenceAction,
  RecurrenceFlow,
} from '#/components/recurrences/recurrence-status.type.ts';

/** Label of an action; "Marcar como paga" or "recebida" depends on the flow. */
export function recurrenceActionLabel(action: RecurrenceAction, flow: RecurrenceFlow): string {
  switch (action) {
    case 'mark-done':
      return flow === 'income' ? 'Marcar como recebida' : 'Marcar como paga';
    case 'link':
      return 'Vincular transação';
    case 'edit-expected':
      return 'Editar valor esperado';
    case 'dismiss':
      return 'Dispensar este mês';
    case 'undismiss':
      return 'Desfazer dispensa';
    case 'edit':
      return 'Editar';
    case 'pause':
      return 'Pausar';
    case 'delete':
      return 'Excluir';
  }
}
