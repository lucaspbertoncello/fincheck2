import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { RecurrenceDateRuleInvalidError } from '#/modules/recurrences/domain/recurrence/recurrence-date-rule-invalid.error.ts';

// How the day of a recurrence is told (BR-REC-001 to 004): a fixed day (that may move off a weekend
// or a holiday, BR-REC-016), the nth business day, "around day X, give or take N days", or any day
// with an optional likely one. Each type asks for some fields and refuses the others, so a rule
// built here is always complete. Immutable.
export class DateRule {
  readonly type: Recurrence.DateRuleType;
  readonly day: number | null;
  readonly businessDayNumber: number | null;
  readonly toleranceDays: number | null;
  readonly nonBusinessDayShift: Recurrence.NonBusinessDayShift | null;

  private constructor(attr: DateRule.Attributes) {
    this.type = attr.type;
    this.day = attr.day;
    this.businessDayNumber = attr.businessDayNumber;
    this.toleranceDays = attr.toleranceDays;
    this.nonBusinessDayShift = attr.nonBusinessDayShift;
  }

  // A missing field is `null`. A fixed day without a shift means "stay on the day" (`none`).
  static create(input: DateRule.Input): DateRule {
    const rule: DateRule.Attributes = {
      type: input.type,
      day: input.day ?? null,
      businessDayNumber: input.businessDayNumber ?? null,
      toleranceDays: input.toleranceDays ?? null,
      nonBusinessDayShift: input.nonBusinessDayShift ?? null,
    };

    const requires = (field: 'day' | 'businessDayNumber' | 'toleranceDays') => {
      if (rule[field] === null) {
        throw new RecurrenceDateRuleInvalidError(`${rule.type} needs ${field}`);
      }
    };
    const forbids = (
      field: 'day' | 'businessDayNumber' | 'toleranceDays' | 'nonBusinessDayShift',
    ) => {
      if (rule[field] !== null) {
        throw new RecurrenceDateRuleInvalidError(`${rule.type} has no ${field}`);
      }
    };

    switch (rule.type) {
      case 'fixed_day':
        requires('day');
        forbids('businessDayNumber');
        forbids('toleranceDays');

        return new DateRule({ ...rule, nonBusinessDayShift: rule.nonBusinessDayShift ?? 'none' });
      case 'business_day':
        requires('businessDayNumber');
        forbids('day');
        forbids('toleranceDays');
        forbids('nonBusinessDayShift');
        break;
      case 'around_day':
        requires('day');
        requires('toleranceDays');
        forbids('businessDayNumber');
        forbids('nonBusinessDayShift');
        break;
      case 'any_day':
        forbids('businessDayNumber');
        forbids('toleranceDays');
        forbids('nonBusinessDayShift');
        break;
    }

    return new DateRule(rule);
  }

  equals(other: DateRule): boolean {
    return (
      this.type === other.type &&
      this.day === other.day &&
      this.businessDayNumber === other.businessDayNumber &&
      this.toleranceDays === other.toleranceDays &&
      this.nonBusinessDayShift === other.nonBusinessDayShift
    );
  }

  // The five fields the contract always answers with.
  toDto(): Recurrence.DateRule {
    return {
      type: this.type,
      day: this.day,
      businessDayNumber: this.businessDayNumber,
      toleranceDays: this.toleranceDays,
      nonBusinessDayShift: this.nonBusinessDayShift,
    };
  }
}

export namespace DateRule {
  export type Attributes = {
    type: Recurrence.DateRuleType;
    day: number | null;
    businessDayNumber: number | null;
    toleranceDays: number | null;
    nonBusinessDayShift: Recurrence.NonBusinessDayShift | null;
  };
  export type Input = {
    type: Recurrence.DateRuleType;
    day?: number | null | undefined;
    businessDayNumber?: number | null | undefined;
    toleranceDays?: number | null | undefined;
    nonBusinessDayShift?: Recurrence.NonBusinessDayShift | null | undefined;
  };
}
