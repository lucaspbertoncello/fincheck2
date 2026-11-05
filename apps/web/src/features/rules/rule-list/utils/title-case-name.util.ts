/** "TREETOOLS" or "rafael silva" as a name in the sentence: "Treetools", "Rafael Silva". */
export function titleCaseName(text: string): string {
  return text
    .toLocaleLowerCase('pt-BR')
    .replace(
      /(^|\s)(\p{L})/gu,
      (_, space: string, letter: string) => space + letter.toLocaleUpperCase('pt-BR'),
    );
}
