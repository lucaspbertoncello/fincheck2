// The "n/N" a bank puts in an installment description ("AMAZON 03/10"). It changes every month, so
// it cannot be part of a description key. Only a pair where n <= N and N >= 2 counts as an
// installment ("12/05" stays: it reads as a date).
export function stripInstallmentSuffix(description: string): string {
  return description.replace(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g, (match, n, total) =>
    Number(n) >= 1 && Number(n) <= Number(total) && Number(total) >= 2 ? '' : match,
  );
}
