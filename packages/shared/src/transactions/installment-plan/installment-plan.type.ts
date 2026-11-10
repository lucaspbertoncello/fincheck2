import type { z } from 'zod';

import type {
  createInstallmentPlanRequestSchema,
  installmentPlanDtoSchema,
  installmentPlanItemDtoSchema,
  listInstallmentPlansQuerySchema,
  updateInstallmentPlanRequestSchema,
} from './installment-plan.schema.ts';

export namespace InstallmentPlan {
  export type Dto = z.infer<typeof installmentPlanDtoSchema>;
  export type ItemDto = z.infer<typeof installmentPlanItemDtoSchema>;
  export type CreateRequest = z.infer<typeof createInstallmentPlanRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateInstallmentPlanRequestSchema>;
  export type ListQuery = z.infer<typeof listInstallmentPlansQuerySchema>;
}
