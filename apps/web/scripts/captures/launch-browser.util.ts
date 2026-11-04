import { chromium, type Browser } from 'playwright';

const CHANNELS = ['msedge', 'chrome'] as const;

/** Uses the Edge (or Chrome) already on the machine; no browser is downloaded. */
export async function launchBrowser(): Promise<Browser> {
  const failures: string[] = [];
  for (const channel of CHANNELS) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      failures.push(
        `${channel}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
      );
    }
  }
  throw new Error(
    `No Microsoft Edge or Google Chrome found. Install one of them.\n${failures.join('\n')}`,
  );
}
