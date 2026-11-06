import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ArchiveCategoryUseCase } from '#/modules/categories/application/category/archive-category.usecase.ts';
import { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';
import { CreateCategoryUseCase } from '#/modules/categories/application/category/create-category.usecase.ts';
import { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';
import { ListCategoriesQuery } from '#/modules/categories/application/category/list-categories.query.ts';
import { UnarchiveCategoryUseCase } from '#/modules/categories/application/category/unarchive-category.usecase.ts';
import { UpdateCategoryUseCase } from '#/modules/categories/application/category/update-category.usecase.ts';
import type { ApplyRuleToHistory } from '#/modules/categories/application/rule/apply-rule-to-history.interface.ts';
import { ApplyRuleUseCase } from '#/modules/categories/application/rule/apply-rule.usecase.ts';
import { CreateRuleUseCase } from '#/modules/categories/application/rule/create-rule.usecase.ts';
import { DeleteRuleUseCase } from '#/modules/categories/application/rule/delete-rule.usecase.ts';
import { GetExistingRuleIdsQuery } from '#/modules/categories/application/rule/get-existing-rule-ids.query.ts';
import { ListRulesQuery } from '#/modules/categories/application/rule/list-rules.query.ts';
import { PreviewRuleQuery } from '#/modules/categories/application/rule/preview-rule.query.ts';
import type { RuleAccountReader } from '#/modules/categories/application/rule/rule-account-reader.interface.ts';
import { RuleCreator } from '#/modules/categories/application/rule/rule-creator.service.ts';
import type { RuleHistoryPreviewer } from '#/modules/categories/application/rule/rule-history-previewer.interface.ts';
import { RulePresenter } from '#/modules/categories/application/rule/rule-presenter.service.ts';
import { RuleReferenceResolver } from '#/modules/categories/application/rule/rule-reference-resolver.service.ts';
import { UpdateRuleUseCase } from '#/modules/categories/application/rule/update-rule.usecase.ts';
import { AcceptRuleSuggestionUseCase } from '#/modules/categories/application/suggestion/accept-rule-suggestion.usecase.ts';
import { DismissRuleSuggestionUseCase } from '#/modules/categories/application/suggestion/dismiss-rule-suggestion.usecase.ts';
import { ListRuleSuggestionsQuery } from '#/modules/categories/application/suggestion/list-rule-suggestions.query.ts';
import type { ManualCategorizationReader } from '#/modules/categories/application/suggestion/manual-categorization-reader.interface.ts';
import { SuggestCategoriesQuery } from '#/modules/categories/application/suggestion/suggest-categories.query.ts';
import { ArchiveTagUseCase } from '#/modules/categories/application/tag/archive-tag.usecase.ts';
import { CreateTagUseCase } from '#/modules/categories/application/tag/create-tag.usecase.ts';
import { GetTagRefsQuery } from '#/modules/categories/application/tag/get-tag-refs.query.ts';
import { ListTagsQuery } from '#/modules/categories/application/tag/list-tags.query.ts';
import { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';
import { UnarchiveTagUseCase } from '#/modules/categories/application/tag/unarchive-tag.usecase.ts';
import { UpdateTagUseCase } from '#/modules/categories/application/tag/update-tag.usecase.ts';
import type { TransactionUsageReader } from '#/modules/categories/application/usage/transaction-usage-reader.interface.ts';
import { ArchiveCategoryController } from '#/modules/categories/http/category/archive-category.controller.ts';
import { createCategoryRoute } from '#/modules/categories/http/category/category.route.ts';
import { CreateCategoryController } from '#/modules/categories/http/category/create-category.controller.ts';
import { ListCategoriesController } from '#/modules/categories/http/category/list-categories.controller.ts';
import { UnarchiveCategoryController } from '#/modules/categories/http/category/unarchive-category.controller.ts';
import { UpdateCategoryController } from '#/modules/categories/http/category/update-category.controller.ts';
import { ApplyRuleController } from '#/modules/categories/http/rule/apply-rule.controller.ts';
import { CreateRuleController } from '#/modules/categories/http/rule/create-rule.controller.ts';
import { DeleteRuleController } from '#/modules/categories/http/rule/delete-rule.controller.ts';
import { ListRulesController } from '#/modules/categories/http/rule/list-rules.controller.ts';
import { PreviewRuleController } from '#/modules/categories/http/rule/preview-rule.controller.ts';
import { createRuleRoute } from '#/modules/categories/http/rule/rule.route.ts';
import { UpdateRuleController } from '#/modules/categories/http/rule/update-rule.controller.ts';
import { AcceptRuleSuggestionController } from '#/modules/categories/http/suggestion/accept-rule-suggestion.controller.ts';
import { DismissRuleSuggestionController } from '#/modules/categories/http/suggestion/dismiss-rule-suggestion.controller.ts';
import { ListRuleSuggestionsController } from '#/modules/categories/http/suggestion/list-rule-suggestions.controller.ts';
import { createRuleSuggestionRoute } from '#/modules/categories/http/suggestion/rule-suggestion.route.ts';
import { ArchiveTagController } from '#/modules/categories/http/tag/archive-tag.controller.ts';
import { CreateTagController } from '#/modules/categories/http/tag/create-tag.controller.ts';
import { ListTagsController } from '#/modules/categories/http/tag/list-tags.controller.ts';
import { createTagRoute } from '#/modules/categories/http/tag/tag.route.ts';
import { UnarchiveTagController } from '#/modules/categories/http/tag/unarchive-tag.controller.ts';
import { UpdateTagController } from '#/modules/categories/http/tag/update-tag.controller.ts';
import { KyselyCategoryRuleRepository } from '#/modules/categories/infra/rule/category-rule.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `categories` module by hand: its routes and the readers `transactions` asks it for
// (the category, the tag, the rule ids and the suggestions of the review queue). It asks three
// owners back: `accounts` (the account of a rule), `transactions` (the use of each category, tag and
// rule; the history a rule previews and recategorizes; what Lucas categorized by hand). They come
// in as ports, built by `createTransactionsCategoryPorts` and by the account query.
export function createCategoriesModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  accounts: RuleAccountReader;
  transactionPorts: {
    usage: TransactionUsageReader;
    historyPreviewer: RuleHistoryPreviewer;
    applyRuleToHistory: ApplyRuleToHistory;
    manualCategorizations: ManualCategorizationReader;
  };
}) {
  const { db, unitOfWork, clock, accounts, transactionPorts } = deps;

  const rules = new KyselyCategoryRuleRepository(db);
  const categoryRefs = new GetCategoryRefsQuery(db);
  const tagRefs = new GetTagRefsQuery(db);
  const references = new RuleReferenceResolver(categoryRefs, tagRefs, accounts);

  const categoryPresenter = new CategoryPresenter(db, transactionPorts.usage);
  const tagPresenter = new TagPresenter(db, transactionPorts.usage);
  const rulePresenter = new RulePresenter(db, transactionPorts.usage);
  const ruleCreator = new RuleCreator(
    rules,
    references,
    transactionPorts.applyRuleToHistory,
    rulePresenter,
    clock,
  );

  const routes = new Hono()
    .route(
      '/',
      createCategoryRoute({
        listCategories: new ListCategoriesController(
          new ListCategoriesQuery(db, categoryPresenter),
        ),
        createCategory: new CreateCategoryController(
          new CreateCategoryUseCase(categoryPresenter, unitOfWork, clock),
        ),
        updateCategory: new UpdateCategoryController(
          new UpdateCategoryUseCase(categoryPresenter, unitOfWork, clock),
        ),
        archiveCategory: new ArchiveCategoryController(
          new ArchiveCategoryUseCase(categoryPresenter, unitOfWork, clock),
        ),
        unarchiveCategory: new UnarchiveCategoryController(
          new UnarchiveCategoryUseCase(categoryPresenter, unitOfWork, clock),
        ),
      }),
    )
    .route(
      '/',
      createTagRoute({
        listTags: new ListTagsController(new ListTagsQuery(db, tagPresenter)),
        createTag: new CreateTagController(new CreateTagUseCase(tagPresenter, unitOfWork, clock)),
        updateTag: new UpdateTagController(new UpdateTagUseCase(tagPresenter, unitOfWork, clock)),
        archiveTag: new ArchiveTagController(
          new ArchiveTagUseCase(tagPresenter, unitOfWork, clock),
        ),
        unarchiveTag: new UnarchiveTagController(
          new UnarchiveTagUseCase(tagPresenter, unitOfWork, clock),
        ),
      }),
    )
    .route(
      '/',
      createRuleRoute({
        listRules: new ListRulesController(new ListRulesQuery(rules, rulePresenter)),
        previewRule: new PreviewRuleController(
          new PreviewRuleQuery(rules, references, transactionPorts.historyPreviewer),
        ),
        createRule: new CreateRuleController(new CreateRuleUseCase(ruleCreator, unitOfWork)),
        updateRule: new UpdateRuleController(
          new UpdateRuleUseCase(rules, references, rulePresenter, unitOfWork, clock),
        ),
        applyRule: new ApplyRuleController(
          new ApplyRuleUseCase(rules, references, transactionPorts.applyRuleToHistory, unitOfWork),
        ),
        deleteRule: new DeleteRuleController(new DeleteRuleUseCase(rules, unitOfWork)),
      }),
    )
    .route(
      '/',
      createRuleSuggestionRoute({
        listRuleSuggestions: new ListRuleSuggestionsController(
          new ListRuleSuggestionsQuery(
            db,
            rules,
            transactionPorts.manualCategorizations,
            transactionPorts.historyPreviewer,
          ),
        ),
        acceptRuleSuggestion: new AcceptRuleSuggestionController(
          new AcceptRuleSuggestionUseCase(ruleCreator, unitOfWork, clock),
        ),
        dismissRuleSuggestion: new DismissRuleSuggestionController(
          new DismissRuleSuggestionUseCase(unitOfWork, clock),
        ),
      }),
    );

  return {
    routes,
    // The readers `transactions` declares and `categories` fulfils.
    transactionReaders: {
      categories: categoryRefs,
      tags: tagRefs,
      categoryRules: new GetExistingRuleIdsQuery(db),
      categorySuggestions: new SuggestCategoriesQuery(
        db,
        rules,
        transactionPorts.manualCategorizations,
      ),
    },
  };
}
