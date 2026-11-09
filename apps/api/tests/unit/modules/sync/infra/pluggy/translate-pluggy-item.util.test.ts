import { describe, expect, it } from 'vitest';

import type { PluggyItem } from '#/modules/sync/infra/pluggy/pluggy-item.type.ts';
import { translatePluggyItem } from '#/modules/sync/infra/pluggy/translate-pluggy-item.util.ts';

const NOW = '2026-11-09T12:00:00.000Z';

const item = (partial: Partial<PluggyItem.Response>): PluggyItem.Response => ({
  id: 'item-1',
  connector: { id: 612, name: 'Nubank' },
  status: 'UPDATED',
  executionStatus: 'SUCCESS',
  lastUpdatedAt: '2026-11-09T09:00:00.000Z',
  ...partial,
});

describe('translatePluggyItem', () => {
  it('translates an updated item as ok', () => {
    expect(translatePluggyItem(item({}), NOW)).toEqual({
      id: 'item-1',
      institutionName: 'Nubank',
      institutionCode: 'nubank',
      state: 'ok',
      errorCode: null,
      lastUpdatedAt: '2026-11-09T09:00:00.000Z',
    });
  });

  it('accepts a partial success as ok', () => {
    expect(translatePluggyItem(item({ executionStatus: 'PARTIAL_SUCCESS' }), NOW)).toMatchObject({
      state: 'ok',
      errorCode: null,
    });
  });

  it.each([
    // The user has to authorize on the phone; the Pluggy goes on by itself afterwards: not an error.
    [
      'execution USER_AUTHORIZATION_PENDING',
      { status: 'OUTDATED', executionStatus: 'USER_AUTHORIZATION_PENDING' },
    ],
    ['status UPDATING', { status: 'UPDATING', executionStatus: 'ACCOUNTS_IN_PROGRESS' }],
    ['status UPDATING with no execution', { status: 'UPDATING', executionStatus: null }],
    ['execution CREATED', { status: 'UPDATED', executionStatus: 'CREATED' }],
    ['execution UPDATING', { status: 'UPDATED', executionStatus: 'UPDATING' }],
    [
      'execution TRANSACTIONS_IN_PROGRESS',
      { status: 'UPDATED', executionStatus: 'TRANSACTIONS_IN_PROGRESS' },
    ],
  ])('is updating, with no error, for %s', (_name, partial) => {
    expect(translatePluggyItem(item(partial), NOW)).toMatchObject({
      state: 'updating',
      errorCode: null,
    });
  });

  it.each([
    ['status LOGIN_ERROR', { status: 'LOGIN_ERROR', executionStatus: 'ERROR' }],
    ['status WAITING_USER_INPUT', { status: 'WAITING_USER_INPUT', executionStatus: null }],
    [
      'execution INVALID_CREDENTIALS',
      { status: 'OUTDATED', executionStatus: 'INVALID_CREDENTIALS' },
    ],
    [
      'execution INVALID_CREDENTIALS_MFA',
      { status: 'UPDATED', executionStatus: 'INVALID_CREDENTIALS_MFA' },
    ],
    [
      'execution USER_INPUT_TIMEOUT',
      { status: 'LOGIN_ERROR', executionStatus: 'USER_INPUT_TIMEOUT' },
    ],
    [
      'execution WAITING_USER_ACTION',
      { status: 'UPDATING', executionStatus: 'WAITING_USER_ACTION' },
    ],
    [
      'execution USER_AUTHORIZATION_NOT_GRANTED',
      { status: 'OUTDATED', executionStatus: 'USER_AUTHORIZATION_NOT_GRANTED' },
    ],
    // The user has to act at the bank (unlock, accept new terms, reset the password): the same
    // answer as a rejected login (https://docs.pluggy.ai/en/docs/connections/item-lifecycle, 09/11/2026).
    ['execution ACCOUNT_LOCKED', { status: 'OUTDATED', executionStatus: 'ACCOUNT_LOCKED' }],
    [
      'execution ACCOUNT_NEEDS_ACTION',
      { status: 'OUTDATED', executionStatus: 'ACCOUNT_NEEDS_ACTION' },
    ],
    [
      'execution ACCOUNT_CREDENTIALS_RESET',
      { status: 'OUTDATED', executionStatus: 'ACCOUNT_CREDENTIALS_RESET' },
    ],
  ])('is a login error for %s', (_name, partial) => {
    expect(translatePluggyItem(item(partial), NOW)).toMatchObject({
      state: 'error',
      errorCode: 'LOGIN_ERROR',
    });
  });

  it.each([
    ['status ERROR', { status: 'ERROR', executionStatus: 'ERROR' }],
    ['status OUTDATED', { status: 'OUTDATED', executionStatus: 'SITE_NOT_AVAILABLE' }],
    ['CONNECTION_ERROR', { status: 'OUTDATED', executionStatus: 'CONNECTION_ERROR' }],
    ['SITE_NOT_AVAILABLE', { status: 'ERROR', executionStatus: 'SITE_NOT_AVAILABLE' }],
    ['an unknown status', { status: 'SOMETHING_NEW', executionStatus: 'SOMETHING_NEW' }],
    ['updated with no execution', { status: 'UPDATED', executionStatus: undefined }],
  ])('is a provider error for %s', (_name, partial) => {
    expect(translatePluggyItem(item(partial), NOW)).toMatchObject({
      state: 'error',
      errorCode: 'PROVIDER_ERROR',
    });
  });

  describe('consent', () => {
    it.each([
      ['OUTDATED', 'USER_AUTHORIZATION_REVOKED'],
      ['LOGIN_ERROR', 'USER_AUTHORIZATION_REVOKED'],
      ['UPDATED', 'USER_AUTHORIZATION_REVOKED'],
    ])(
      'an item %s with the execution status %s is CONSENT_REVOKED (the user withdrew the consent)',
      (status, executionStatus) => {
        expect(translatePluggyItem(item({ status, executionStatus }), NOW)).toMatchObject({
          state: 'error',
          errorCode: 'CONSENT_REVOKED',
        });
      },
    );

    it.each([
      ['CONSENT_REVOKED', 'LOGIN_ERROR'],
      ['consent_expired', 'ERROR'],
      ['USER_REVOKED_ACCESS', 'ERROR'],
      ['ACCESS_EXPIRED', 'LOGIN_ERROR'],
    ])('an error code %s becomes CONSENT_REVOKED', (code, status) => {
      expect(
        translatePluggyItem(item({ status, executionStatus: status, error: { code } }), NOW),
      ).toMatchObject({ state: 'error', errorCode: 'CONSENT_REVOKED' });
    });

    it('turns a login problem into CONSENT_REVOKED when the consent ended in the past', () => {
      expect(
        translatePluggyItem(
          item({
            status: 'LOGIN_ERROR',
            executionStatus: 'ERROR',
            consentExpiresAt: '2026-11-08T23:59:59.000Z',
          }),
          NOW,
        ),
      ).toMatchObject({ state: 'error', errorCode: 'CONSENT_REVOKED' });
    });

    it('turns an item that looks ok into CONSENT_REVOKED when the consent ended', () => {
      expect(
        translatePluggyItem(item({ consentExpiresAt: '2026-01-01T00:00:00.000Z' }), NOW),
      ).toMatchObject({ state: 'error', errorCode: 'CONSENT_REVOKED' });
    });

    it('keeps the state when the consent ends in the future', () => {
      expect(
        translatePluggyItem(item({ consentExpiresAt: '2027-01-01T00:00:00.000Z' }), NOW),
      ).toMatchObject({ state: 'ok', errorCode: null });
      expect(
        translatePluggyItem(
          item({
            status: 'LOGIN_ERROR',
            executionStatus: 'ERROR',
            consentExpiresAt: '2027-01-01T00:00:00.000Z',
          }),
          NOW,
        ),
      ).toMatchObject({ errorCode: 'LOGIN_ERROR' });
    });

    it('does not turn an update in progress into an error', () => {
      expect(
        translatePluggyItem(
          item({ status: 'UPDATING', executionStatus: 'UPDATING', consentExpiresAt: '2026-01-01' }),
          NOW,
        ),
      ).toMatchObject({ state: 'updating', errorCode: null });
    });
  });

  describe('lastUpdatedAt', () => {
    it.each([
      ['2026-11-09T09:00:00.000Z', '2026-11-09T09:00:00.000Z'],
      ['2026-11-09T09:00:00Z', '2026-11-09T09:00:00.000Z'],
      ['2026-11-09T06:00:00-03:00', '2026-11-09T09:00:00.000Z'],
      [null, null],
      [undefined, null],
      ['not a date', null],
    ])('%s is %s', (lastUpdatedAt, expected) => {
      expect(translatePluggyItem(item({ lastUpdatedAt }), NOW).lastUpdatedAt).toBe(expected);
    });
  });

  it('never carries the message of the provider', () => {
    const translated = translatePluggyItem(
      item({
        status: 'LOGIN_ERROR',
        executionStatus: 'ERROR',
        error: { code: '101', message: 'wrong password: hunter2' },
      }),
      NOW,
    );

    expect(JSON.stringify(translated)).not.toContain('hunter2');
    expect(JSON.stringify(translated)).not.toContain('message');
  });

  it('matches the institution by the name of the connector', () => {
    expect(
      translatePluggyItem(item({ connector: { id: 1, name: 'Itau Cartoes' } }), NOW),
    ).toMatchObject({ institutionName: 'Itau Cartoes', institutionCode: 'itau' });
    expect(
      translatePluggyItem(item({ connector: { id: 2, name: 'Banco Original' } }), NOW),
    ).toMatchObject({ institutionCode: 'other' });
  });

  it('throws when the body is not what was documented', () => {
    expect(() => translatePluggyItem(item({ id: '' }), NOW)).toThrow(TypeError);
    expect(() => translatePluggyItem(item({ connector: undefined }), NOW)).toThrow(TypeError);
  });
});
