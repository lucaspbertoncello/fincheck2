import { randomBytes } from 'node:crypto';

let lastTimestamp = -1;
let sequence = 0;

// A UUID v7: 48 bits of the time in milliseconds, then random bits, so ids sort by creation. Two
// ids in the same millisecond keep their order through a 12-bit sequence in `rand_a`.
export function generateId(timestamp: number = Date.now()): string {
  if (timestamp <= lastTimestamp) {
    sequence++;
    if (sequence > 0xfff) {
      lastTimestamp++;
      sequence = 0;
    }
  } else {
    lastTimestamp = timestamp;
    sequence = 0;
  }

  const bytes = randomBytes(16);
  bytes.writeUIntBE(lastTimestamp, 0, 6);
  bytes[6] = 0x70 | (sequence >> 8);
  bytes[7] = sequence & 0xff;
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);

  const hex = bytes.toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
