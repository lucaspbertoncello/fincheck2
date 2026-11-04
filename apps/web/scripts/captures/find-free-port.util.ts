import { createServer } from 'node:net';

/** A free TCP port on 127.0.0.1, chosen by the OS (never the 5173 that the person uses). */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}
