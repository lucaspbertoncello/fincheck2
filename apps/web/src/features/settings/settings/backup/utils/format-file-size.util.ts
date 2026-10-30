const sizeFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "14,2 MB", "820,0 KB": the size of a backup file. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1_048_576) return `${sizeFormat.format(bytes / 1024)} KB`;
  return `${sizeFormat.format(bytes / 1_048_576)} MB`;
}
