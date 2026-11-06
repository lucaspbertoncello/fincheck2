import { matchesRuleCondition } from '#/modules/categories/domain/rule/matches-rule-condition.util.ts';
import { RuleActionRequiredError } from '#/modules/categories/domain/rule/rule-action-required.error.ts';
import { RuleDisabledError } from '#/modules/categories/domain/rule/rule-disabled.error.ts';
import { RuleCategoryArchivedError } from '#/modules/categories/domain/rule/rule-category-archived.error.ts';
import { RuleCategoryKindMismatchError } from '#/modules/categories/domain/rule/rule-category-kind-mismatch.error.ts';
import { RuleTagArchivedError } from '#/modules/categories/domain/rule/rule-tag-archived.error.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

// The root of the rule: "whenever [condition], categorize as [X] / add tag [Y]" (RF-CAT-004).
// It holds what must always be true of a rule: a text condition, a sane amount range, an action,
// a category of its own kind. The oldest rule wins on the category and the tags of all add up, so
// the order is the creation order (`createdAt`).
export class CategoryRule {
  readonly id: string;
  descriptionContains: string | null;
  counterpartyContains: string | null;
  kind: 'expense' | 'income' | null;
  accountId: string | null;
  amountMinCents: number | null;
  amountMaxCents: number | null;
  categoryId: string | null;
  tagIds: string[];
  enabled: boolean;
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: CategoryRule.Attributes) {
    this.id = attr.id ?? generateId();
    this.descriptionContains = attr.descriptionContains;
    this.counterpartyContains = attr.counterpartyContains;
    this.kind = attr.kind;
    this.accountId = attr.accountId;
    this.amountMinCents = attr.amountMinCents;
    this.amountMaxCents = attr.amountMaxCents;
    this.categoryId = attr.categoryId;
    this.tagIds = attr.tagIds;
    this.enabled = attr.enabled;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // A new rule is on. The texts come already normalized. `category` and `tags` are what the ids of
  // the request point to (the use case read them): they decide the kind, archived and action rules.
  static create(input: CategoryRule.CreateInput, now: string): CategoryRule {
    CategoryRule.assertTextCondition(input);
    CategoryRule.assertAmountRange(input);
    if (input.category === null && input.tags.length === 0) throw new RuleActionRequiredError();
    CategoryRule.assertKindFits(input.kind, input.category);
    if (input.category?.isArchived) throw new RuleCategoryArchivedError();
    if (input.tags.some((tag) => tag.isArchived)) throw new RuleTagArchivedError();

    return new CategoryRule({
      descriptionContains: input.descriptionContains,
      counterpartyContains: input.counterpartyContains,
      kind: input.kind,
      accountId: input.accountId,
      amountMinCents: input.amountMinCents,
      amountMaxCents: input.amountMaxCents,
      categoryId: input.category?.id ?? null,
      tagIds: [...new Set(input.tags.map((tag) => tag.id))],
      enabled: true,
      createdAt: now,
    });
  }

  // A field left out is kept; `null` clears a condition or the category. `category` is the category
  // the rule ends up with and `tags` the new set (both read by the use case). Editing does not touch
  // the transactions: reapplying is a separate action. A category or tag the rule already had may
  // be archived and stay; a new one may not (N10).
  edit(patch: CategoryRule.EditInput, refs: CategoryRule.EditRefs, now: string): void {
    const next = {
      descriptionContains:
        patch.descriptionContains === undefined
          ? this.descriptionContains
          : patch.descriptionContains,
      counterpartyContains:
        patch.counterpartyContains === undefined
          ? this.counterpartyContains
          : patch.counterpartyContains,
      kind: patch.kind === undefined ? this.kind : patch.kind,
      accountId: patch.accountId === undefined ? this.accountId : patch.accountId,
      amountMinCents:
        patch.amountMinCents === undefined ? this.amountMinCents : patch.amountMinCents,
      amountMaxCents:
        patch.amountMaxCents === undefined ? this.amountMaxCents : patch.amountMaxCents,
    };
    CategoryRule.assertTextCondition(next);
    CategoryRule.assertAmountRange(next);

    const nextTagIds = patch.tagIds === undefined ? this.tagIds : [...new Set(patch.tagIds)];
    if (refs.category === null && nextTagIds.length === 0) throw new RuleActionRequiredError();
    CategoryRule.assertKindFits(next.kind, refs.category);
    if (refs.category?.isArchived && refs.category.id !== this.categoryId) {
      throw new RuleCategoryArchivedError();
    }
    if (refs.newTags.some((tag) => tag.isArchived)) throw new RuleTagArchivedError();

    this.descriptionContains = next.descriptionContains;
    this.counterpartyContains = next.counterpartyContains;
    this.kind = next.kind;
    this.accountId = next.accountId;
    this.amountMinCents = next.amountMinCents;
    this.amountMaxCents = next.amountMaxCents;
    this.categoryId = refs.category?.id ?? null;
    this.tagIds = nextTagIds;
    if (patch.enabled !== undefined) this.enabled = patch.enabled;
    this.updatedAt = now;
  }

  // The condition of the rule, to match and to compare with another rule.
  condition(): CategoryRule.Condition {
    return {
      descriptionContains: this.descriptionContains,
      counterpartyContains: this.counterpartyContains,
      kind: this.kind,
      accountId: this.accountId,
      amountMinCents: this.amountMinCents,
      amountMaxCents: this.amountMaxCents,
    };
  }

  matches(candidate: CategoryRule.Candidate): boolean {
    return matchesRuleCondition(this.condition(), candidate);
  }

  // `RULE_DUPLICATE`: the six fields of the condition are the same, on or off.
  hasSameConditionAs(condition: CategoryRule.Condition): boolean {
    const mine = this.condition();

    return (
      mine.descriptionContains === condition.descriptionContains &&
      mine.counterpartyContains === condition.counterpartyContains &&
      mine.kind === condition.kind &&
      mine.accountId === condition.accountId &&
      mine.amountMinCents === condition.amountMinCents &&
      mine.amountMaxCents === condition.amountMaxCents
    );
  }

  // Applying to the history needs a rule that is on and whose category (if any) is not archived (N10).
  assertAppliable(category: CategoryRule.CategoryRef | null): void {
    if (!this.enabled) throw new RuleDisabledError();
    if (category?.isArchived) throw new RuleCategoryArchivedError();
  }

  private static assertTextCondition(condition: {
    descriptionContains: string | null;
    counterpartyContains: string | null;
  }): void {
    if (condition.descriptionContains === null && condition.counterpartyContains === null) {
      throw new RequestValidationError([
        {
          path: 'descriptionContains',
          message: 'Send descriptionContains or counterpartyContains',
        },
      ]);
    }
  }

  private static assertAmountRange(condition: {
    amountMinCents: number | null;
    amountMaxCents: number | null;
  }): void {
    if (
      condition.amountMinCents !== null &&
      condition.amountMaxCents !== null &&
      condition.amountMaxCents < condition.amountMinCents
    ) {
      throw new RequestValidationError([
        { path: 'amountMaxCents', message: 'amountMaxCents must not be below amountMinCents' },
      ]);
    }
  }

  private static assertKindFits(
    kind: 'expense' | 'income' | null,
    category: CategoryRule.CategoryRef | null,
  ): void {
    if (kind !== null && category !== null && kind !== category.kind) {
      throw new RuleCategoryKindMismatchError();
    }
  }
}

export namespace CategoryRule {
  export type Attributes = {
    id?: string;
    descriptionContains: string | null;
    counterpartyContains: string | null;
    kind: 'expense' | 'income' | null;
    accountId: string | null;
    amountMinCents: number | null;
    amountMaxCents: number | null;
    categoryId: string | null;
    tagIds: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt?: string;
  };

  // What the rule needs to know of the other aggregates, as plain values read by the use case.
  export type CategoryRef = { id: string; kind: 'expense' | 'income'; isArchived: boolean };
  export type TagRef = { id: string; isArchived: boolean };

  // The six fields that say which transactions a rule sees.
  export type Condition = {
    descriptionContains: string | null;
    counterpartyContains: string | null;
    kind: 'expense' | 'income' | null;
    accountId: string | null;
    amountMinCents: number | null;
    amountMaxCents: number | null;
  };

  // What a transaction shows to a rule. Descriptions as they are: the match normalizes them.
  export type Candidate = {
    // In use.
    description: string;
    bankDescription: string | null;
    // Who sent or received it, from the bank.
    counterparty: string | null;
    nature: 'expense' | 'income';
    accountId: string;
    // With sign: the match compares the absolute value.
    amountCents: number;
  };

  export type CreateInput = Condition & { category: CategoryRef | null; tags: TagRef[] };

  export type EditInput = {
    [Field in keyof Condition]?: Condition[Field] | undefined;
  } & { tagIds?: string[] | undefined; enabled?: boolean | undefined };

  // The category the rule ends up with and the tags that are new to it.
  export type EditRefs = { category: CategoryRef | null; newTags: TagRef[] };
}
