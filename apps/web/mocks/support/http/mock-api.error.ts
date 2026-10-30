// An error the mock API answers with `{ code, message, details? }` and this status.
export class MockApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: string, message?: string, details?: Record<string, unknown>) {
    super(message ?? `Erro simulado: ${code}`);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
