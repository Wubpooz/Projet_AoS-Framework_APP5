import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, ids, jsonHeaders } from '../test/route-test-utils';

const collectionService: any = {
  createCollection: async () => fixtures.collection,
  listCollections: async () => ({ ...fixtures.paginatedCollections, data: [fixtures.collection], total: 1, pages: 1 }),
  listUserInvitations: async () => [fixtures.collectionMember],
  getById: async () => fixtures.collection,
  updateById: async () => fixtures.collection,
  deleteById: async () => true,
  addMediaToCollection: async () => fixtures.collectionMedia,
  listCollectionMedia: async () => [fixtures.collectionMedia],
  updateCollectionMedia: async () => fixtures.collectionMedia,
  removeMediaFromCollection: async () => true,
  addMemberToCollection: async () => fixtures.collectionMember,
  listCollectionMembers: async () => [fixtures.collectionMember],
  updateCollectionMember: async () => fixtures.collectionMember,
  removeMemberFromCollection: async () => true,
  respondToInvitation: async (_collectionId: string, _userId: string, accept: boolean) => (accept ? { ...fixtures.collectionMember, accepted: true } : null),
};

mock.module('@/services/collection.service', () => ({ collectionService }));

const { collectionRoutes } = await import('./collection.routes');

describe('collectionRoutes', () => {
  beforeEach(() => {
    collectionService.createCollection = async () => fixtures.collection;
    collectionService.listCollections = async () => ({ ...fixtures.paginatedCollections, data: [fixtures.collection], total: 1, pages: 1 });
    collectionService.listUserInvitations = async () => [fixtures.collectionMember];
    collectionService.getById = async () => fixtures.collection;
    collectionService.updateById = async () => fixtures.collection;
    collectionService.deleteById = async () => true;
    collectionService.addMediaToCollection = async () => fixtures.collectionMedia;
    collectionService.listCollectionMedia = async () => [fixtures.collectionMedia];
    collectionService.updateCollectionMedia = async () => fixtures.collectionMedia;
    collectionService.removeMediaFromCollection = async () => true;
    collectionService.addMemberToCollection = async () => fixtures.collectionMember;
    collectionService.listCollectionMembers = async () => [fixtures.collectionMember];
    collectionService.updateCollectionMember = async () => fixtures.collectionMember;
    collectionService.removeMemberFromCollection = async () => true;
    collectionService.respondToInvitation = async (_collectionId: string, _userId: string, accept: boolean) => (accept ? { ...fixtures.collectionMember, accepted: true } : null);
  });

  it('requires authentication to create a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes);

    const response = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'Favorites' }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('creates a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Favorites',
        description: 'Shared favorites',
        tags: ['favorites'],
        visibility: 'PUBLIC',
      }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe(ids.collectionId);
  });

  it('lists collections', async () => {
    const { app } = createRouteTestApp(collectionRoutes);

    const response = await app.request('/?page=1&pageSize=20&tag=favorites');
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ids.collectionId);
  });

  it('lists invitations for an authenticated user', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.inviteeUser,
      session: { ...fixtures.session, userId: ids.inviteeUserId },
    });

    const response = await app.request('/invitations');
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ids.memberId);
  });

  it('returns 404 when a collection is not found', async () => {
    collectionService.getById = async () => null;
    const { app } = createRouteTestApp(collectionRoutes);

    const response = await app.request(`/${ids.collectionId}`);
    const body: any = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Collection not found' });
  });

  it('rejects empty collection patch payloads', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    });
    const body: any = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'No fields to update' });
  });

  it('deletes a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}`, {
      method: 'DELETE',
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Collection deleted successfully' });
  });

  it('adds media to a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/media`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ mediaId: ids.mediaId, position: 1 }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe(ids.collectionMediaId);
  });

  it('lists media in a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes);

    const response = await app.request(`/${ids.collectionId}/media`);
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ids.collectionMediaId);
  });

  it('returns 404 when collection media update target is missing', async () => {
    collectionService.updateCollectionMedia = async () => null;
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/media/${ids.collectionMediaId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ position: 2 }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Collection media not found' });
  });

  it('removes media from a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/media/${ids.collectionMediaId}`, {
      method: 'DELETE',
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Media removed from collection successfully' });
  });

  it('invites a member to a collection', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/members`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: ids.inviteeUserId, role: 'COLLABORATOR' }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe(ids.memberId);
  });

  it('lists collection members', async () => {
    const { app } = createRouteTestApp(collectionRoutes);

    const response = await app.request(`/${ids.collectionId}/members`);
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ids.memberId);
  });

  it('returns 404 when a collection member update target is missing', async () => {
    collectionService.updateCollectionMember = async () => null;
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/members/${ids.memberId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ role: 'READER' }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Collection member not found' });
  });

  it('removes a collection member', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.collectionId}/members/${ids.memberId}`, {
      method: 'DELETE',
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Member removed from collection successfully' });
  });

  it('accepts an invitation', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.inviteeUser,
      session: { ...fixtures.session, userId: ids.inviteeUserId },
    });

    const response = await app.request(`/${ids.collectionId}/invitations/respond`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ accept: true }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.accepted).toBe(true);
  });

  it('rejects an invitation with 204', async () => {
    const { app } = createRouteTestApp(collectionRoutes, {
      user: fixtures.inviteeUser,
      session: { ...fixtures.session, userId: ids.inviteeUserId },
    });

    const response = await app.request(`/${ids.collectionId}/invitations/respond`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ accept: false }),
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
