import { BACKUP_FILE_NAME_PATTERN } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';

import { businessTimeOfInstant } from '#/shared/date/business-time-of-instant.util.ts';
import { instantOfBusinessTime } from '#/shared/date/instant-of-business-time.util.ts';
import { padNumber } from '#/shared/date/pad-number.util.ts';

// The name of a backup file, `fincheck-AAAA-MM-DD-HHmmss.db`, in America/Sao_Paulo time. The name
// is the source of truth for when the backup was made (not the modification date of the file, which
// a copy to another disk changes). Immutable.
export class BackupFileName {
  readonly value: string;
  // The instant of the name, ISO 8601 in UTC.
  readonly createdAt: string;

  private constructor(value: string, createdAt: string) {
    this.value = value;
    this.createdAt = createdAt;
  }

  // The name of a backup made at `instant` (the seconds are the precision of the name).
  static fromInstant(instant: string): BackupFileName {
    const time = businessTimeOfInstant(instant);
    const date = `${padNumber(time.year, 4)}-${padNumber(time.month, 2)}-${padNumber(time.day, 2)}`;
    const clock = `${padNumber(time.hour, 2)}${padNumber(time.minute, 2)}${padNumber(time.second, 2)}`;

    return new BackupFileName(`fincheck-${date}-${clock}.db`, instantOfBusinessTime(time));
  }

  // The name of a file in the folder, or null when it does not follow the pattern or is not a real
  // date and time.
  static parse(name: string): BackupFileName | null {
    if (!BACKUP_FILE_NAME_PATTERN.test(name)) return null;
    const createdAt = instantOfBusinessTime({
      year: Number(name.slice(9, 13)),
      month: Number(name.slice(14, 16)),
      day: Number(name.slice(17, 19)),
      hour: Number(name.slice(20, 22)),
      minute: Number(name.slice(22, 24)),
      second: Number(name.slice(24, 26)),
    });
    const roundTrip = BackupFileName.fromInstant(createdAt);

    return roundTrip.value === name ? roundTrip : null;
  }

  // The name for `instant`, moved forward second by second while it is taken: two files made in the
  // same second (a backup, then the safety copy of a restore) must not overwrite each other.
  static firstFree(instant: string, taken: ReadonlySet<string>): BackupFileName {
    let candidate = BackupFileName.fromInstant(instant);
    while (taken.has(candidate.value)) {
      candidate = BackupFileName.fromInstant(
        new Date(Date.parse(candidate.createdAt) + 1000).toISOString(),
      );
    }

    return candidate;
  }

  // The day of the name, `YYYY-MM-DD`: the day the backup counts for.
  get day(): string {
    return this.value.slice(9, 19);
  }
}
