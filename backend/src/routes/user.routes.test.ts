import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, ids, jsonHeaders } from '../test/route-test-utils';

const userService: any = {
  getById: async () => fixtures.ownerUser,
  updateById: async () => fixtures.ownerUser,
  getPublicCollections: async () => [fixtures.collection],
};

mock.module('@/services/user.service', () => ({ userService }));

const { userRoutes } = await import('./user.routes');

describe('userRoutes', () => {
  beforeEach(() => {
    userService.getById = async (id: string) => (id === ids.ownerUserId ? fixtures.ownerUser : fixtures.inviteeUser);
    userService.updateById = async () => ({
      ...fixtures.ownerUser,
      name: 'Updated Owner',
      displayUsername: 'Updated Owner',
    });
    userService.getPublicCollections = async () => [fixtures.collection];
  });

  it('returns the authenticated user profile', async () => {
    const { app } = createRouteTestApp(userRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/me');
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe(ids.ownerUserId);
  });

  it('updates the authenticated user profile', async () => {
    const { app } = createRouteTestApp(userRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/me', {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Updated Owner',
        displayUsername: 'Updated Owner',
      }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.name).toBe('Updated Owner');
    expect(body.user.displayUsername).toBe('Updated Owner');
  });

  it('returns a public user profile by id', async () => {
    const { app } = createRouteTestApp(userRoutes);

    const response = await app.request(`/${ids.inviteeUserId}`);
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe(ids.inviteeUserId);
  });

  it('lists public collections for a user', async () => {
    const { app } = createRouteTestApp(userRoutes);

    const response = await app.request(`/${ids.ownerUserId}/collections`);
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.collections).toHaveLength(1);
    expect(body.collections[0].id).toBe(ids.collectionId);
  });

  it('rejects non-json profile updates', async () => {
    const { app } = createRouteTestApp(userRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/plain' },
      body: 'name=bad',
    });
    const body: any = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Content-Type must be application/json' });
  });
});
