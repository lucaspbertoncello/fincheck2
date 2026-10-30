type ChartDataTableProps = {
  /** What the numbers are ("Gasto acumulado por dia"). */
  caption: string;
  columns: readonly string[];
  /** One array of cell texts per row, in the order of `columns`. */
  rows: readonly (readonly string[])[];
};

/** Table twin of a chart: invisible, but read by screen readers (the chart itself is hidden). */
export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells) => (
          <tr key={cells[0]}>
            {cells.map((cell, index) => (
              <td key={columns[index]}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
