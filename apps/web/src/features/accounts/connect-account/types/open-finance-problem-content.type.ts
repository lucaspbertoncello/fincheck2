export type OpenFinanceProblemContent = {
  variant: 'warning' | 'error';
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
};
