export type PluggySetupProps = {
  clientId: string;
  clientSecret: string;
  errors: { clientId?: string; clientSecret?: string };
  isSaving: boolean;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onSubmit: () => void;
};
