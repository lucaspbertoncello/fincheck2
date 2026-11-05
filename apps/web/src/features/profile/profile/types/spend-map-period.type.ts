/**
 * The period the Perfil spend map shows (BR-PRF-003): a month or a year. `month` (`YYYY-MM`) is the
 * month in "month" mode and carries the year in "year" mode (its first four characters), so
 * switching between the two keeps where the person was.
 */
export type SpendMapPeriod = {
  mode: 'month' | 'year';
  month: string;
};
