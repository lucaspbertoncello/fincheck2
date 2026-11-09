// `..` and `.` resolved, repeated and forward slashes made into one backslash, no trailing
// backslash (the root `C:\` keeps its own): the path as Windows would show it.
export function normalizeFolderPath(folderPath: string): string {
  const unified = folderPath.replaceAll('/', '\\');
  const isShare = unified.startsWith('\\\\');
  const parts = unified.split('\\').filter((part) => part !== '');
  const head = isShare ? parts.splice(0, 2).join('\\') : (parts.shift() ?? '');

  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }

  const prefix = isShare ? `\\\\${head}` : head;
  if (resolved.length === 0) return isShare ? prefix : `${prefix}\\`;

  return `${prefix}\\${resolved.join('\\')}`;
}
