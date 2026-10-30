let counter = 0;

// Ids in the mock are UUIDs numbered in order, so a reset gives the same ids again.
export function newId(): string {
  counter += 1;

  return `0194f3a0-0000-7000-8000-${String(counter).padStart(12, '0')}`;
}

export function resetMockIds(): void {
  counter = 0;
}
