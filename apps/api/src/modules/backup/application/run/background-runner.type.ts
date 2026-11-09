// Starts a task after the answer of the request is on its way (`POST /backup/runs` and
// `POST /backup/restore` answer 202 and finish later). The real one defers it to the next turn of the
// event loop; a test passes one that keeps the promise to wait for it.
export type BackgroundRunner = (task: () => Promise<void>) => void;
