// The port that says whether the sync must not run now. The backup (piece 10) pauses it while it
// restores the database: a round that wrote in the middle of a restore would be lost or, worse,
// land in the wrong file. The scheduled task, the round at start and `POST /sync/connections/:id/runs`
// ask it before touching anything: paused, no round runs. The real answer comes from the backup,
// wired in `main`; until then `main` wires one that is never paused.
export interface SyncPauseGate {
  isPaused(): boolean;
}
