export type StepStatus = 'done' | 'current' | 'todo';

/** One step of a guided flow ("Conectar no Meu Pluggy", "Escolher os bancos"). */
export type StepItem = {
  key: string;
  title: string;
  description?: string;
  status: StepStatus;
};
