// What the API is doing with backups right now, in memory: nothing, a backup or a restore. Only one
// at a time (`BACKUP_IN_PROGRESS`), and `GET /backup` shows it as `running`.
export class BackupActivity {
  private current: BackupActivity.Kind | null = null;

  // Takes the turn; false when something is already running.
  tryStart(kind: BackupActivity.Kind): boolean {
    if (this.current !== null) return false;
    this.current = kind;

    return true;
  }

  finish(): void {
    this.current = null;
  }

  isRunning(): boolean {
    return this.current !== null;
  }
}

export namespace BackupActivity {
  export type Kind = 'backup' | 'restore';
}
