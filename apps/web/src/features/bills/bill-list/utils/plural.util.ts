/** `1, 'conta', 'contas'` -> `1 conta`; `3, ...` -> `3 contas`. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
