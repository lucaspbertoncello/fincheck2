import type { z } from 'zod';

import type {
  createInstallmentPlanRequestSchema,
  installmentPlanDtoSchema,
  installmentPlanItemDtoSchema,
  listInstallmentPlansQuerySchema,
} from './installment-plan.schema.ts';

export namespace InstallmentPlan {
  export type Dto = z.infer<typeof installmentPlanDtoSchema>;
  export type ItemDto = z.infer<typeof installmentPlanItemDtoSchema>;
  export type CreateRequest = z.infer<typeof createInstallmentPlanRequestSchema>;
  export type ListQuery = z.infer<typeof listInstallmentPlansQuerySchema>;
}
