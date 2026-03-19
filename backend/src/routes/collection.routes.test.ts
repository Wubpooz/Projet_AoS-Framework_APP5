import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, ids, jsonHeaders } from '../test/route-test-utils';
import { clone } from '../test/common-test-utils';
import { AppError } from '@/middleware/errorHandler';

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

function installStatefulScenarioService() {
  const state = {
    collections: new Map<string, any>(),
    members: new Map<string, any>(),
  };

  const getAcceptedMember = (collectionId: string, userId?: string) => {
    if (!userId) return undefined;
    return [...state.members.values()].find(
      (member) => member.collectionId === collectionId && member.userId === userId && member.accepted === true
    );
  };

  const computeCollectionCounts = (collectionId: string) => ({
    media: 0,
    members: [...state.members.values()].filter((member) => member.collectionId === collectionId).length,
  });

  const ensureOwner = (collectionId: string, userId: string) => {
    const collection = state.collections.get(collectionId);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }
    if (collection.ownerId !== userId) {
      throw new AppError('Forbidden', 403);
    }
    return collection;
  };

  collectionService.createCollection = async (data: any, userId: string) => {
    const collection = {
      ...clone(fixtures.collection),
      id: ids.collectionId,
      name: data.name,
      description: data.description ?? null,
      tags: data.tags ?? [],
      visibility: data.visibility ?? 'PRIVATE',
      ownerId: userId,
      _count: { media: 0, members: 0 },
    };
    state.collections.set(collection.id, collection);
    return clone(collection);
  };

  collectionService.listCollections = async (_query: any, userId?: string) => {
    const data = [...state.collections.values()]
      .filter((collection) => collection.visibility === 'PUBLIC' || collection.ownerId === userId || !!getAcceptedMember(collection.id, userId))
      .map((collection) => ({ ...clone(collection), _count: computeCollectionCounts(collection.id) }));

    return {
      ...fixtures.paginatedCollections,
      data,
      total: data.length,
      pages: data.length > 0 ? 1 : 0,
    };
  };

  collectionService.listUserInvitations = async (userId: string) => {
    return clone([...state.members.values()].filter((member) => member.userId === userId && member.accepted === false));
  };

  collectionService.getById = async (collectionId: string, userId?: string) => {
    const collection = state.collections.get(collectionId);
    if (!collection) {
      return null;
    }

    const hasAccess =
      collection.visibility === 'PUBLIC' ||
      collection.ownerId === userId ||
      !!getAcceptedMember(collectionId, userId);

    if (!hasAccess) {
      return null;
    }

    return {
      ...clone(collection),
      _count: computeCollectionCounts(collectionId),
    };
  };

  collectionService.updateById = async (collectionId: string, data: any, userId: string) => {
    const collection = ensureOwner(collectionId, userId);
    Object.assign(collection, data, { updatedAt: '2026-03-10T11:00:00.000Z' });
    return clone({ ...collection, _count: computeCollectionCounts(collectionId) });
  };

  collectionService.deleteById = async (collectionId: string, userId: string) => {
    ensureOwner(collectionId, userId);
    state.collections.delete(collectionId);
    for (const [memberId, member] of state.members.entries()) {
      if (member.collectionId === collectionId) {
        state.members.delete(memberId);
      }
    }
    return true;
  };

  collectionService.addMemberToCollection = async (collectionId: string, memberUserId: string, role: string, userId: string) => {
    ensureOwner(collectionId, userId);

    const existing = [...state.members.values()].find(
      (member) => member.collectionId === collectionId && member.userId === memberUserId
    );
    if (existing) {
      throw new AppError('User already a member', 400);
    }

    const member = {
      ...clone(fixtures.collectionMember),
      id: ids.memberId,
      collectionId,
      userId: memberUserId,
      role,
      accepted: false,
      user: memberUserId === ids.inviteeUserId ? clone(fixtures.inviteeUser) : clone(fixtures.ownerUser),
    };

    state.members.set(member.id, member);
    return clone(member);
  };

  collectionService.listCollectionMembers = async (collectionId: string, userId?: string) => {
    const collection = await collectionService.getById(collectionId, userId);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }

    return clone([...state.members.values()].filter((member) => member.collectionId === collectionId));
  };

  collectionService.updateCollectionMember = async (collectionId: string, memberId: string, data: any, userId: string) => {
    ensureOwner(collectionId, userId);
    const member = state.members.get(memberId);
    if (!member || member.collectionId !== collectionId) {
      throw new AppError('Collection member not found', 404);
    }

    Object.assign(member, data);
    return clone(member);
  };

  collectionService.removeMemberFromCollection = async (collectionId: string, memberId: string, userId: string) => {
    ensureOwner(collectionId, userId);
    const member = state.members.get(memberId);
    if (!member || member.collectionId !== collectionId) {
      throw new AppError('Collection member not found', 404);
    }

    state.members.delete(memberId);
    return true;
  };

  collectionService.respondToInvitation = async (collectionId: string, userId: string, accept: boolean) => {
    const member = [...state.members.values()].find(
      (entry) => entry.collectionId === collectionId && entry.userId === userId
    );

    if (!member) {
      throw new AppError('Invitation not found', 404);
    }
    if (member.accepted) {
      throw new AppError('Invitation already accepted', 400);
    }

    if (!accept) {
      state.members.delete(member.id);
      return null;
    }

    member.accepted = true;
    return clone(member);
  };
}

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

  it('covers the public collection lifecycle scenario', async () => {
    installStatefulScenarioService();
    const { app, setAuth } = createRouteTestApp(collectionRoutes);

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const createResponse = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Public Scenario Collection',
        description: 'Scenario 01 public lifecycle',
        tags: ['public', 'scenario'],
        visibility: 'PUBLIC',
      }),
    });
    expect(createResponse.status).toBe(201);

    setAuth({ user: null, session: null });
    const listResponse = await app.request('/?page=1&pageSize=20');
    const listBody: any = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listBody.data.some((collection: any) => collection.id === ids.collectionId)).toBe(true);

    const publicGetResponse = await app.request(`/${ids.collectionId}`);
    expect(publicGetResponse.status).toBe(200);

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const updateResponse = await app.request(`/${ids.collectionId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'Updated Public Scenario Collection' }),
    });
    const updateBody: any = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updateBody.name).toBe('Updated Public Scenario Collection');

    setAuth({ user: null, session: null });
    const verifyResponse = await app.request(`/${ids.collectionId}`);
    const verifyBody: any = await verifyResponse.json();
    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.name).toBe('Updated Public Scenario Collection');

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const deleteResponse = await app.request(`/${ids.collectionId}`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(200);
  });

  it('covers the private invitation acceptance scenario', async () => {
    installStatefulScenarioService();
    const { app, setAuth } = createRouteTestApp(collectionRoutes);
    const inviteeSession = { ...fixtures.session, userId: ids.inviteeUserId };

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const createResponse = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Private Watch List',
        description: 'Scenario 02 private invitation acceptance',
        tags: ['private', 'scenario'],
        visibility: 'PRIVATE',
      }),
    });
    expect(createResponse.status).toBe(201);

    const inviteResponse = await app.request(`/${ids.collectionId}/members`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: ids.inviteeUserId, role: 'COLLABORATOR' }),
    });
    expect(inviteResponse.status).toBe(201);

    setAuth({ user: fixtures.inviteeUser, session: inviteeSession });
    const invitationsResponse = await app.request('/invitations');
    const invitationsBody: any = await invitationsResponse.json();
    expect(invitationsResponse.status).toBe(200);
    expect(invitationsBody).toHaveLength(1);
    expect(invitationsBody[0].collectionId).toBe(ids.collectionId);

    const acceptResponse = await app.request(`/${ids.collectionId}/invitations/respond`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ accept: true }),
    });
    const acceptBody: any = await acceptResponse.json();
    expect(acceptResponse.status).toBe(200);
    expect(acceptBody.accepted).toBe(true);

    const inviteeGetResponse = await app.request(`/${ids.collectionId}`);
    expect(inviteeGetResponse.status).toBe(200);

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const membersResponse = await app.request(`/${ids.collectionId}/members`);
    const membersBody: any = await membersResponse.json();
    expect(membersResponse.status).toBe(200);
    expect(membersBody.some((member: any) => member.userId === ids.inviteeUserId && member.accepted === true)).toBe(true);
  });

  it('covers the role downgrade and removal scenario', async () => {
    installStatefulScenarioService();
    const { app, setAuth } = createRouteTestApp(collectionRoutes);
    const inviteeSession = { ...fixtures.session, userId: ids.inviteeUserId };

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const createResponse = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Role Test Collection',
        description: 'Scenario 03 role downgrade and removal',
        tags: ['role', 'scenario'],
        visibility: 'PRIVATE',
      }),
    });
    expect(createResponse.status).toBe(201);

    const inviteResponse = await app.request(`/${ids.collectionId}/members`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: ids.inviteeUserId, role: 'COLLABORATOR' }),
    });
    expect(inviteResponse.status).toBe(201);

    setAuth({ user: fixtures.inviteeUser, session: inviteeSession });
    const acceptResponse = await app.request(`/${ids.collectionId}/invitations/respond`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ accept: true }),
    });
    expect(acceptResponse.status).toBe(200);

    setAuth({ user: fixtures.ownerUser, session: fixtures.session });
    const downgradeResponse = await app.request(`/${ids.collectionId}/members/${ids.memberId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ role: 'READER' }),
    });
    const downgradeBody: any = await downgradeResponse.json();
    expect(downgradeResponse.status).toBe(200);
    expect(downgradeBody.role).toBe('READER');

    const membersAfterDowngradeResponse = await app.request(`/${ids.collectionId}/members`);
    const membersAfterDowngradeBody: any = await membersAfterDowngradeResponse.json();
    expect(membersAfterDowngradeResponse.status).toBe(200);
    expect(membersAfterDowngradeBody.some((member: any) => member.id === ids.memberId && member.role === 'READER')).toBe(true);

    const removeResponse = await app.request(`/${ids.collectionId}/members/${ids.memberId}`, {
      method: 'DELETE',
    });
    expect(removeResponse.status).toBe(200);

    const membersAfterRemovalResponse = await app.request(`/${ids.collectionId}/members`);
    const membersAfterRemovalBody: any = await membersAfterRemovalResponse.json();
    expect(membersAfterRemovalResponse.status).toBe(200);
    expect(membersAfterRemovalBody.some((member: any) => member.id === ids.memberId)).toBe(false);

    setAuth({ user: fixtures.inviteeUser, session: inviteeSession });
    const removedInviteeGetResponse = await app.request(`/${ids.collectionId}`);
    const removedInviteeGetBody: any = await removedInviteeGetResponse.json();
    expect(removedInviteeGetResponse.status).toBe(404);
    expect(removedInviteeGetBody).toEqual({ error: 'Collection not found' });
  });

});
