import { BANK_CARDS_SECTIONS } from '#gallery/components/groups/bank-cards-group.component.tsx';
import { BASE_SECTIONS } from '#gallery/components/groups/base-group.component.tsx';
import { CHARTS_SECTIONS } from '#gallery/components/groups/charts-group.component.tsx';
import { DAY_STRIP_SECTIONS } from '#gallery/components/groups/day-strip-group.component.tsx';
import { FEEDBACK_SECTIONS } from '#gallery/components/groups/feedback-group.component.tsx';
import { FORM_MODAL_SECTIONS } from '#gallery/components/groups/form-modal-group.component.tsx';
import { FORMS_SECTIONS } from '#gallery/components/groups/forms-group.component.tsx';
import { ICONS_SECTIONS } from '#gallery/components/groups/icons-group.component.tsx';
import { MONTH_SUMMARY_SECTIONS } from '#gallery/components/groups/month-summary-group.component.tsx';
import { RECURRENCES_SECTIONS } from '#gallery/components/groups/recurrences-group.component.tsx';
import { REVIEW_SECTIONS } from '#gallery/components/groups/review-group.component.tsx';
import { RULES_SECTIONS } from '#gallery/components/groups/rules-group.component.tsx';
import { SETTINGS_SECTIONS } from '#gallery/components/groups/settings-group.component.tsx';
import { SHELL_SECTIONS } from '#gallery/components/groups/shell-group.component.tsx';
import { TRANSACTIONS_SECTIONS } from '#gallery/components/groups/transactions-group.component.tsx';
import type { GalleryGroupDef } from '#gallery/types/gallery-group.type.ts';

/** The side index, in the order of the brief. */
export const GALLERY_GROUPS: GalleryGroupDef[] = [
  { id: 'base', title: 'Base', sections: BASE_SECTIONS },
  { id: 'forms', title: 'Formulários', sections: FORMS_SECTIONS },
  { id: 'form-modal', title: 'Padrão de modal', sections: FORM_MODAL_SECTIONS },
  { id: 'icons', title: 'Ícones', sections: ICONS_SECTIONS },
  { id: 'bank-cards', title: 'Cartões de banco', sections: BANK_CARDS_SECTIONS },
  { id: 'day-strip', title: 'Faixa de dias', sections: DAY_STRIP_SECTIONS },
  { id: 'charts', title: 'Gráficos', sections: CHARTS_SECTIONS },
  { id: 'feedback', title: 'Feedback e sobreposições', sections: FEEDBACK_SECTIONS },
  {
    id: 'transactions',
    title: 'Transações e revisão',
    sections: [...TRANSACTIONS_SECTIONS, ...REVIEW_SECTIONS],
  },
  {
    id: 'recurrences',
    title: 'Recorrências e regras',
    sections: [...RECURRENCES_SECTIONS, ...RULES_SECTIONS],
  },
  { id: 'month-summary', title: 'Resumo do mês', sections: MONTH_SUMMARY_SECTIONS },
  { id: 'settings', title: 'Configurações e categorias', sections: SETTINGS_SECTIONS },
  { id: 'shell', title: 'Casca', sections: SHELL_SECTIONS },
];
