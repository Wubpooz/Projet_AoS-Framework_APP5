import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, jsonHeaders } from '../test/route-test-utils';

const registerPassword = ['StrongPass', '123!'].join('');
const newPassword = ['EvenStronger', '123!'].join('');

const authApi: any = {
  signUpEmail: async () => ({ user: fixtures.ownerUser } as any),
  signInEmail: async () => ({ user: fixtures.ownerUser, token: 'owner-token' }),
  signOut: async () => undefined,
  requestPasswordReset: async () => undefined,
  resetPassword: async () => undefined,
};

mock.module('@/middleware/auth', () => ({
  auth: {
    api: authApi,
  },
}));

const { authRoutes } = await import('./auth.routes');

describe('authRoutes', () => {
  beforeEach(() => {
    authApi.signUpEmail = async () => ({ user: fixtures.ownerUser });
    authApi.signInEmail = async () => ({ user: fixtures.ownerUser, token: 'owner-token' });
    authApi.signOut = async () => undefined;
    authApi.requestPasswordReset = async () => undefined;
    authApi.resetPassword = async () => undefined;
  });

  it('registers a new user', async () => {
    const { app } = createRouteTestApp(authRoutes);

    const response = await app.request('/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: 'owner@example.com',
        password: registerPassword,
        name: 'Owner User',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json() as any).toEqual({
      message: 'Registration successful',
      user: fixtures.ownerUser,
    });
  });

  it('logs in and returns bearer-friendly headers', async () => {
    const { app } = createRouteTestApp(authRoutes);

    const response = await app.request('/login', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        email: 'owner@example.com',
        password: registerPassword,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-auth-token')).toBe('owner-token');
    expect(response.headers.get('set-cookie')).toContain('better-auth.session_token=owner-token');

    const body = await response.json() as any;
    expect(body.message).toBe('Login successful');
    expect(body.sessionToken).toBe('owner-token');
  });

  it('logs out an authenticated user', async () => {
    const { app } = createRouteTestApp(authRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/logout', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(await response.json() as any).toEqual({ message: 'Logout successful' });
  });

  it('starts a password reset flow', async () => {
    const { app } = createRouteTestApp(authRoutes);

    const response = await app.request('/forgot-password', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email: 'owner@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json() as any).toEqual({ message: 'Password reset email sent' });
  });

  it('resets a password with a token', async () => {
    const { app } = createRouteTestApp(authRoutes);

    const response = await app.request('/reset-password', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        token: 'reset-token',
        newPassword,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json() as any).toEqual({ message: 'Password reset successful' });
  });

  it('returns the authenticated profile from /me', async () => {
    const { app } = createRouteTestApp(authRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/me');
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.message).toBe('Authenticated user profile and session info');
    expect(body.user.id).toBe(fixtures.ownerUser.id);
    expect(body.session.id).toBe(fixtures.session.id);
  });
});
