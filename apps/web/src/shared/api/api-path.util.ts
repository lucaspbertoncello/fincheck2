// Builds a path from a template, encoding each value: apiPath`/bills/${id}`. Never concatenate ids.
export function apiPath(strings: TemplateStringsArray, ...values: string[]): string {
  return strings.reduce(
    (path, chunk, index) =>
      path + chunk + (index < values.length ? encodeURIComponent(values[index] ?? '') : ''),
    '',
  );
}
