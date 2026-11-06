/** One of the four numbers at the top of the Dados page, ready to draw. */
export type DataFigureItem = {
  /** "Tamanho do banco". */
  label: string;
  /** "2,6 MB", "812", "03/11/2025", "5". */
  value: string;
  /** The line under the value: what the number counts. */
  caption: string;
};
