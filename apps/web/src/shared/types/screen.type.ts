export type TabKey = 'overview' | 'transactions' | 'recurrences' | 'accounts' | 'categories';

export type ScreenKey =
  | 'overview'
  | 'transactions'
  | 'recurrences'
  | 'bills'
  | 'accounts'
  | 'categories'
  | 'rules'
  | 'settings';

export type ScreenDefinition = {
  key: ScreenKey;
  path: string;
  /** Title in the page header. Sub-screens share the title of their tab. */
  title: string;
  /** The top tab this screen belongs to; null for the settings screen (gear). */
  tab: TabKey | null;
  /** Accessible name of the "+" on this screen (screens.md, "Botão +"). */
  plusLabel: string;
  /** "direct" opens the screen's own modal (a later feature); "menu" opens the general menu. */
  plusMode: 'menu' | 'direct';
  /** Action key of a "direct" "+" (see PLUS_ACTION_PATHS). */
  plusAction?: string;
  /** True where the month filters something: Visão geral, Transações and Recorrentes. */
  filtersByMonth: boolean;
  /** True where the summary panel shows (every screen but Configurações). */
  showsPanel: boolean;
  /** Sub-tabs under the header. */
  subNav?: 'recurrences' | 'categories';
};
