// The port that runs a round without making the request wait for it: the first connection and the
// "Tentar agora" answer 202 at once and the round goes on (`POST /sync/connections`, `POST
// /sync/connections/:id/runs`). The real one starts the work and swallows its failure (a round
// records its own failure; whatever else it throws has nobody to answer); a test one keeps the
// promises so the test can wait for them.
export interface BackgroundRunner {
  start(task: () => Promise<void>): void;
}
