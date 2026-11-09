export namespace PluggyItem {
  export type Response = {
    id: string;
    connector: { id: number | string; name: string };
    status: string;
    executionStatus?: string | null;
    lastUpdatedAt?: string | null;
    consentExpiresAt?: string | null;
    error?: { code?: string | null; message?: string | null } | null;
  };
}
