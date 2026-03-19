import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { AppError, createAuthError, errorHandler, resolveApiErrorStatus } from './errorHandler';

describe('errorHandler middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const consoleErrorSpy = mock(() => undefined);

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    consoleErrorSpy.mockClear();
    console.error = consoleErrorSpy as unknown as typeof console.error;
  });

  it('returns a generic message for unexpected 500 errors', async () => {
    const app = new Hono();

    app.use('*', async (c, next) => {
      const ctx = c as any;
      ctx.set('requestId', 'req-1');
      ctx.set('user', { id: 'user-1', email: 'user@example.com' });
      await next();
    });

    app.post('/boom', async () => {
      throw new Error('sensitive details');
    });

    app.onError(errorHandler);

    const response = await app.request('/boom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });

    const body = await response.json() as any;
    expect(response.status).toBe(500);
    expect(body.error.message).toBe('Internal Server Error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('returns the explicit app error message for operational errors', async () => {
    const app = new Hono();

    app.get('/bad-request', async () => {
      throw new AppError('Bad request payload', 400);
    });

    app.onError(errorHandler);

    const response = await app.request('/bad-request');
    const body = await response.json() as any;

    expect(response.status).toBe(400);
    expect(body.error.message).toBe('Bad request payload');
  });

  it('creates auth errors with fallback message in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('leaky internal detail');

    const authError = createAuthError('Authentication failed', err);

    expect(authError).toBeInstanceOf(AppError);
    expect(authError.statusCode).toBe(500);
    expect(authError.message).toBe('Authentication failed');
    expect(authError.cause).toBe(err);
  });

  it('creates auth errors with original message outside production', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('token parsing failed');

    const authError = createAuthError('Authentication failed', err);

    expect(authError.message).toBe('token parsing failed');
  });

  it('resolves API status from numeric and symbolic values', () => {
    expect(resolveApiErrorStatus({ statusCode: 422 })).toBe(422);
    expect(resolveApiErrorStatus({ status: 'NOT_FOUND' })).toBe(404);
    expect(resolveApiErrorStatus({ status: 'WHATEVER' })).toBe(500);
    expect(resolveApiErrorStatus({})).toBe(500);
  });

  it('preserves app error metadata', () => {
    const cause = new Error('origin');
    const appError = new AppError('Forbidden', 403, cause);

    expect(appError.name).toBe('AppError');
    expect(appError.message).toBe('Forbidden');
    expect(appError.statusCode).toBe(403);
    expect(appError.isOperational).toBe(true);
    expect(appError.cause).toBe(cause);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });
});
