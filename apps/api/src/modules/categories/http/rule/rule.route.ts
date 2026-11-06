import {
  createRuleRequestSchema,
  previewRuleRequestSchema,
  updateRuleRequestSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { Hono } from 'hono';

import type { ApplyRuleController } from '#/modules/categories/http/rule/apply-rule.controller.ts';
import type { CreateRuleController } from '#/modules/categories/http/rule/create-rule.controller.ts';
import type { DeleteRuleController } from '#/modules/categories/http/rule/delete-rule.controller.ts';
import type { ListRulesController } from '#/modules/categories/http/rule/list-rules.controller.ts';
import type { PreviewRuleController } from '#/modules/categories/http/rule/preview-rule.controller.ts';
import type { UpdateRuleController } from '#/modules/categories/http/rule/update-rule.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The automatic rules (RF-CAT-004, RF-CAT-006). `/rules/preview` and `/rules/:id/apply` do not
// clash with `/rules/:id`: the verbs and the paths differ.
export function createRuleRoute(controllers: {
  listRules: ListRulesController;
  previewRule: PreviewRuleController;
  createRule: CreateRuleController;
  updateRule: UpdateRuleController;
  applyRule: ApplyRuleController;
  deleteRule: DeleteRuleController;
}) {
  return new Hono()
    .get('/rules', async (c) => c.json(await controllers.listRules.handle(), 200))
    .post('/rules/preview', validateRequest('json', previewRuleRequestSchema), async (c) =>
      c.json(await controllers.previewRule.handle({ body: c.req.valid('json') }), 200),
    )
    .post('/rules', validateRequest('json', createRuleRequestSchema), async (c) =>
      c.json(await controllers.createRule.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/rules/:id',
      validateRequest('param', idParamSchema),
      validateRequest('json', updateRuleRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateRule.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/rules/:id/apply', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.applyRule.handle({ params: c.req.valid('param') }), 200),
    )
    .delete('/rules/:id', validateRequest('param', idParamSchema), async (c) => {
      await controllers.deleteRule.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    });
}
