import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleError } from '#/main/http/handle-error.util.ts';
import { ConflictError } from '#/shared/errors/conflict.error.ts';
import { DomainError } from '#/shared/errors/domain.error.ts';
import { NotFoundError } from '#/shared/errors/not-found.error.ts';
import { ValidationError } from '#/shared/errors/validation.error.ts';

class InvoiceAlreadyClosedError extends DomainError {
  readonly code = 'INVOICE_ALREADY_CLOSED';
}
class InvoiceNotFoundError extends NotFoundError {
  readonly code = 'INVOICE_NOT_FOUND';
}
class DuplicatedCategoryError extends ConflictError {
  readonly code = 'DUPLICATED_CATEGORY';
}
class InvalidAmountError extends ValidationError {
  readonly code = 'INVALID_AMOUNT';
}

const appThrowing = (error: Error) =>
  new Hono().onError(handleError).get('/boom', () => {
    throw error;
  });

describe('handleError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns a domain error into 422 with its code, message and details', async () => {
    const response = await appThrowing(
      new InvoiceAlreadyClosedError('A fatura já está fechada.', { invoiceId: 'inv-1' }),
    ).request('/boom');

    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json())).toEqual({
      code: 'INVOICE_ALREADY_CLOSED',
      message: 'A fatura já está fechada.',
      details: { invoiceId: 'inv-1' },
    });
  });

  it.each([
    [new InvoiceNotFoundError('Fatura não encontrada.'), 404, 'INVOICE_NOT_FOUND'],
    [new DuplicatedCategoryError('Categoria repetida.'), 409, 'DUPLICATED_CATEGORY'],
    [new InvalidAmountError('Valor inválido.'), 400, 'INVALID_AMOUNT'],
  ])('maps %o to %i', async (error, status, code) => {
    const response = await appThrowing(error).request('/boom');

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
  });

  it('hides an unknown error behind a generic 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await appThrowing(new Error('token=secret')).request('/boom');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado na API.',
    });
    expect(log).toHaveBeenCalledOnce();
  });
});
