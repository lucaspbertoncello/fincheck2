// Base of every error the API raises on purpose. Each concrete error declares a stable `code`
// (`INVOICE_ALREADY_CLOSED`) and extends one family: domain, not found, conflict or validation.
// Business rules never throw an HTTP error nor a bare `Error`.
export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}
