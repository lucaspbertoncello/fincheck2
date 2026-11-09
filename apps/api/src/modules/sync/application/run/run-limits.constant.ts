// The runs a connection keeps (BR-SYN-003): the round trims the older ones.
export const RUNS_KEPT = 200;

// A round that says `running` for longer than this is one the API died in the middle of: it holds
// nothing, and a new round may start (it is closed as an error).
export const RUN_STALE_AFTER_MS = 30 * 60 * 1000;

// The scheduled round only looks at a connection whose last run started more than this ago (BR-SYN-003:
// a search each hour).
export const RUN_EVERY_MS = 60 * 60 * 1000;

// Right after the first connection the Pluggy is still reading the bank: the round waits for it, up
// to this many looks and this long between them (about two minutes), before it gives up for now.
export const ITEM_WAIT_ATTEMPTS = 12;
export const ITEM_WAIT_DELAY_MS = 10_000;
