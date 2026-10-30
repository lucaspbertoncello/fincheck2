import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';

// Codes the client itself raises, apart from the `code`s the API sends (see the contract).
export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  requestInvalid: 'REQUEST_INVALID',
  responseInvalid: 'RESPONSE_INVALID',
  unknown: 'UNKNOWN_ERROR',
} as const;

// Every failed call becomes this. The screen decides by `code`, never by `message`.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Builds the error from an HTTP error answer; a body outside `{ code, message }` is `UNKNOWN_ERROR`. */
  static fromResponseBody(status: number, body: unknown): ApiError {
    const parsed = apiErrorSchema.safeParse(body);
    if (!parsed.success) {
      return new ApiError(status, CLIENT_ERROR_CODES.unknown, `A API respondeu ${status}`);
    }

    return new ApiError(status, parsed.data.code, parsed.data.message, parsed.data.details);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the error is an `ApiError` with this `code`. */
export function hasApiErrorCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}
