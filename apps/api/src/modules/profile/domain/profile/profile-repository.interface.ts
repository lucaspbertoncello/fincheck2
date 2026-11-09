import type { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';

// The port to the store of the profile (one record). `Executor` is the database handle: pass the
// one of a unit of work to read and write inside it.
export interface ProfileRepository<Executor> {
  // Null when nothing was ever saved.
  find(executor?: Executor): Promise<Profile | null>;
  // Creates the record or replaces it.
  save(profile: Profile, executor?: Executor): Promise<void>;
}
