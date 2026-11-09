import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

// Port to the sources of income of the profile (BR-PRF-002): the active income recurrences, each
// with the next day it is expected. The owner is `recurrences`; the order is the profile's.
export interface ProfileIncomeSourceReader {
  listIncomeSources(): Promise<Profile.IncomeSource[]>;
}
