import { mkdir } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import type { Page } from 'playwright';

import {
  CAPTURE_NOW_ISO,
  CAPTURE_TARGETS,
  CAPTURE_THEMES,
  CAPTURE_VIEWPORTS,
  type CaptureTarget,
} from '#scripts/captures/capture-targets.constant.ts';
import { launchBrowser } from '#scripts/captures/launch-browser.util.ts';
import { prepareBrowserContext } from '#scripts/captures/prepare-browser-context.util.ts';
import { startMockServer, type MockServer } from '#scripts/captures/start-mock-server.util.ts';

// `pnpm captures <folder>`: photographs every screen and main modal, light and dark, desktop and
// phone, with the fictitious data and the frozen date. Starts ONE mock server and always stops it.

const SETTLE_MS = 600;
const TOTAL = CAPTURE_TARGETS.length * CAPTURE_VIEWPORTS.length * CAPTURE_THEMES.length;

async function main(): Promise<void> {
  const folderArgument = process.argv[2];
  if (!folderArgument) throw new Error('Usage: pnpm captures <folder>');
  const folder = isAbsolute(folderArgument)
    ? folderArgument
    : resolve(process.env['INIT_CWD'] ?? process.cwd(), folderArgument);
  await mkdir(folder, { recursive: true });

  let server: MockServer | undefined;
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
    process.on(signal, () => {
      server?.stop();
      process.exit(1);
    });
  }

  try {
    server = await startMockServer(CAPTURE_NOW_ISO);
    const browser = await launchBrowser();
    let count = 0;
    try {
      for (const theme of CAPTURE_THEMES) {
        for (const viewport of CAPTURE_VIEWPORTS) {
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo',
            reducedMotion: 'reduce',
            colorScheme: theme,
          });
          await prepareBrowserContext(context, CAPTURE_NOW_ISO, theme);
          const page = await context.newPage();
          for (const target of CAPTURE_TARGETS) {
            const file = `${target.name} ${viewport.name} ${theme}.png`;
            await capture(page, server.origin, target, resolve(folder, file));
            count += 1;
            console.log(`${count}/${TOTAL} ${file}`);
          }
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
    console.log(`Done: ${count} captures in ${folder}`);
  } finally {
    server?.stop();
  }
}

async function capture(
  page: Page,
  origin: string,
  target: CaptureTarget,
  file: string,
): Promise<void> {
  await page.goto(`${origin}${target.path}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-splash'));
  if (target.kind === 'modal') await page.locator('[role="dialog"]').first().waitFor();
  if (target.kind === 'section' && target.sectionId) {
    const section = page.locator(`#${target.sectionId}`);
    await section.waitFor();
    await section.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: file, fullPage: target.kind === 'screen', animations: 'disabled' });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
