import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpRoutes } from '@/mcp';
import { AppError } from '@/middleware/errorHandler';
import { createRouteTestApp, fixtures, ids, jsonHeaders } from '../test/route-test-utils';
import { clone } from '../test/common-test-utils';

const TOKENS = {
  owner: 'owner-token',
  invitee: 'invitee-token',
} as const;

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

const mediaService: any = {
  createMedia: async () => fixtures.media,
  listMedia: async () => ({ ...fixtures.paginatedMedia, data: [fixtures.media], total: 1, pages: 1 }),
  getById: async () => fixtures.media,
  updateById: async () => fixtures.media,
  deleteById: async () => true,
};

const userService: any = {
  getById: async (userId: string) => (userId === ids.ownerUserId ? fixtures.ownerUser : fixtures.inviteeUser),
  updateById: async (_userId: string, data: Record<string, unknown>) => ({ ...fixtures.ownerUser, ...data }),
  getPublicCollections: async () => [fixtures.collection],
};

mock.module('@/services/collection.service', () => ({ collectionService }));
const { collectionRoutes } = await import('../routes/collection.routes');

const resolveSession: any = async (headers?: Pick<Headers, 'get'> | Record<string, unknown> | null) => {
  const headerRecord = (typeof headers === 'object' && headers ? headers as Record<string, unknown> : undefined);
  const authorization =
    (typeof headers?.get === 'function' ? headers.get('authorization') : null) ??
    (typeof headers?.get === 'function' ? headers.get('Authorization') : null) ??
    (headerRecord?.['authorization'] as string | undefined) ??
    (headerRecord?.['Authorization'] as string | undefined) ??
    null;

  if (authorization === `Bearer ${TOKENS.owner}`) {
    return {
      user: clone(fixtures.ownerUser),
      session: clone(fixtures.session),
      token: TOKENS.owner,
    };
  }

  if (authorization === `Bearer ${TOKENS.invitee}`) {
    return {
      user: clone(fixtures.inviteeUser),
      session: { ...clone(fixtures.session), userId: ids.inviteeUserId },
      token: TOKENS.invitee,
    };
  }

  return {
    user: null,
    session: null,
    token: undefined,
  };
};

function resetBaseServices() {
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

  mediaService.createMedia = async () => fixtures.media;
  mediaService.listMedia = async () => ({ ...fixtures.paginatedMedia, data: [fixtures.media], total: 1, pages: 1 });
  mediaService.getById = async () => fixtures.media;
  mediaService.updateById = async () => fixtures.media;
  mediaService.deleteById = async () => true;

  userService.getById = async (userId: string) => (userId === ids.ownerUserId ? clone(fixtures.ownerUser) : clone(fixtures.inviteeUser));
  userService.updateById = async (_userId: string, data: Record<string, unknown>) => ({ ...clone(fixtures.ownerUser), ...data });
  userService.getPublicCollections = async () => [clone(fixtures.collection)];
}

function installStatefulScenarioService() {
  const state = {
    collections: new Map<string, any>(),
    members: new Map<string, any>(),
  };

  const getAcceptedMember = (collectionId: string, userId?: string) => {
    if (!userId) {
      return undefined;
    }

    return [...state.members.values()].find(
      (member) => member.collectionId === collectionId && member.userId === userId && member.accepted === true,
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
      (member) => member.collectionId === collectionId && member.userId === memberUserId,
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
      (entry) => entry.collectionId === collectionId && entry.userId === userId,
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

function createMcpApp() {
  const app = new Hono();
  app.route('/mcp', createMcpRoutes({
    collectionService,
    mediaService,
    userService,
    resolveSession,
    log: () => undefined,
  }));
  return app;
}

const createLocalFetch = (app: Hono) => {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const request = input instanceof Request
      ? input
      : new Request(typeof input === 'string' ? input : input.toString(), init);
    const url = new URL(request.url);
    const body = request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

    return app.request(`${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body,
    });
  };
};

async function createClient(app: Hono, token?: string) {
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
    fetch: createLocalFetch(app),
    requestInit: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });

  const client = new Client({
    name: 'aos-mcp-test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await client.connect(transport);

  return {
    client,
    transport,
    async close() {
      await client.close();
      await transport.close();
    },
  };
}

const getEnvelope = (result: any) => {
  const textPayload = result.content?.find((item: any) => item.type === 'text')?.text;
  return (result.structuredContent ?? (textPayload ? JSON.parse(textPayload) : undefined)) as {
    ok: boolean;
    tool: string;
    data?: any;
    error?: { status: number; code: string; message: string };
  };
};

describe('MCP routes', () => {
  const clients: Array<{ close: () => Promise<void> }> = [];

  beforeEach(() => {
    resetBaseServices();
  });

  afterEach(async () => {
    while (clients.length > 0) {
      await clients.pop()?.close();
    }
  });

  it('lists the expected MCP tools', async () => {
    const app = createMcpApp();
    const session = await createClient(app);
    clients.push(session);

    const result = await session.client.listTools();
    const toolNames = result.tools.map((tool) => tool.name);

    expect(toolNames).toContain('collections.list');
    expect(toolNames).toContain('collections.inviteMember');
    expect(toolNames).toContain('media.create');
    expect(toolNames).toContain('users.updateMe');
  });

  it('allows anonymous access to public read tools', async () => {
    const app = createMcpApp();
    const session = await createClient(app);
    clients.push(session);

    const result = await session.client.callTool({
      name: 'collections.list',
      arguments: { page: 1, pageSize: 20 },
    });
    const envelope = getEnvelope(result);

    expect(envelope.ok).toBe(true);
    expect(envelope.data.data[0].id).toBe(ids.collectionId);
  });

  it('fails fast for protected tools without a bearer token', async () => {
    const app = createMcpApp();
    const session = await createClient(app);
    clients.push(session);

    const result = await session.client.callTool({
      name: 'collections.create',
      arguments: { name: 'Nope' },
    });
    const envelope = getEnvelope(result);

    expect(result.isError).toBe(true);
    expect(envelope.ok).toBe(false);
    expect(envelope.error?.status).toBe(401);
    expect(envelope.error?.code).toBe('UNAUTHORIZED');
  });

  it('creates a collection for an authenticated caller', async () => {
    const app = createMcpApp();
    const session = await createClient(app, TOKENS.owner);
    clients.push(session);

    const result = await session.client.callTool({
      name: 'collections.create',
      arguments: {
        name: 'Favorites',
        description: 'Shared favorites',
        tags: ['favorites'],
        visibility: 'PUBLIC',
      },
    });
    const envelope = getEnvelope(result);

    expect(envelope.ok).toBe(true);
    expect(envelope.data.id).toBe(ids.collectionId);
  });

  it('covers the public collection lifecycle through MCP', async () => {
    installStatefulScenarioService();
    const app = createMcpApp();
    const owner = await createClient(app, TOKENS.owner);
    const anonymous = await createClient(app);
    clients.push(owner, anonymous);

    const createResult = getEnvelope(await owner.client.callTool({
      name: 'collections.create',
      arguments: {
        name: 'Public Scenario Collection',
        description: 'Scenario 01 public lifecycle',
        tags: ['public', 'scenario'],
        visibility: 'PUBLIC',
      },
    }));
    expect(createResult.ok).toBe(true);

    const listResult = getEnvelope(await anonymous.client.callTool({
      name: 'collections.list',
      arguments: { page: 1, pageSize: 20 },
    }));
    expect(listResult.data.data.some((collection: any) => collection.id === ids.collectionId)).toBe(true);

    const getResult = getEnvelope(await anonymous.client.callTool({
      name: 'collections.get',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(getResult.ok).toBe(true);

    const updateResult = getEnvelope(await owner.client.callTool({
      name: 'collections.update',
      arguments: {
        collectionId: ids.collectionId,
        name: 'Updated Public Scenario Collection',
      },
    }));
    expect(updateResult.data.name).toBe('Updated Public Scenario Collection');

    const verifyResult = getEnvelope(await anonymous.client.callTool({
      name: 'collections.get',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(verifyResult.data.name).toBe('Updated Public Scenario Collection');

    const deleteResult = getEnvelope(await owner.client.callTool({
      name: 'collections.delete',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(deleteResult.ok).toBe(true);
    expect(deleteResult.data.deleted).toBe(true);
  });

  it('covers the private invitation acceptance flow through MCP', async () => {
    installStatefulScenarioService();
    const app = createMcpApp();
    const owner = await createClient(app, TOKENS.owner);
    const invitee = await createClient(app, TOKENS.invitee);
    clients.push(owner, invitee);

    await owner.client.callTool({
      name: 'collections.create',
      arguments: {
        name: 'Private Watch List',
        description: 'Scenario 02 private invitation acceptance',
        tags: ['private', 'scenario'],
        visibility: 'PRIVATE',
      },
    });

    const inviteResult = getEnvelope(await owner.client.callTool({
      name: 'collections.inviteMember',
      arguments: {
        collectionId: ids.collectionId,
        userId: ids.inviteeUserId,
        role: 'COLLABORATOR',
      },
    }));
    expect(inviteResult.ok).toBe(true);

    const invitationsResult = getEnvelope(await invitee.client.callTool({
      name: 'collections.listInvitations',
      arguments: {},
    }));
    expect(invitationsResult.data).toHaveLength(1);
    expect(invitationsResult.data[0].collectionId).toBe(ids.collectionId);

    const acceptResult = getEnvelope(await invitee.client.callTool({
      name: 'collections.respondToInvitation',
      arguments: {
        collectionId: ids.collectionId,
        accept: true,
      },
    }));
    expect(acceptResult.data.accepted).toBe(true);

    const inviteeGetResult = getEnvelope(await invitee.client.callTool({
      name: 'collections.get',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(inviteeGetResult.ok).toBe(true);

    const membersResult = getEnvelope(await owner.client.callTool({
      name: 'collections.listMembers',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(membersResult.data.some((member: any) => member.userId === ids.inviteeUserId && member.accepted === true)).toBe(true);
  });

  it('covers role downgrade and removal through MCP', async () => {
    installStatefulScenarioService();
    const app = createMcpApp();
    const owner = await createClient(app, TOKENS.owner);
    const invitee = await createClient(app, TOKENS.invitee);
    clients.push(owner, invitee);

    await owner.client.callTool({
      name: 'collections.create',
      arguments: {
        name: 'Role Test Collection',
        description: 'Scenario 03 role downgrade and removal',
        tags: ['role', 'scenario'],
        visibility: 'PRIVATE',
      },
    });

    await owner.client.callTool({
      name: 'collections.inviteMember',
      arguments: {
        collectionId: ids.collectionId,
        userId: ids.inviteeUserId,
        role: 'COLLABORATOR',
      },
    });

    await invitee.client.callTool({
      name: 'collections.respondToInvitation',
      arguments: {
        collectionId: ids.collectionId,
        accept: true,
      },
    });

    const downgradeResult = getEnvelope(await owner.client.callTool({
      name: 'collections.updateMember',
      arguments: {
        collectionId: ids.collectionId,
        memberId: ids.memberId,
        role: 'READER',
      },
    }));
    expect(downgradeResult.data.role).toBe('READER');

    const removeResult = getEnvelope(await owner.client.callTool({
      name: 'collections.removeMember',
      arguments: {
        collectionId: ids.collectionId,
        memberId: ids.memberId,
      },
    }));
    expect(removeResult.data.deleted).toBe(true);

    const removedInviteeResult = getEnvelope(await invitee.client.callTool({
      name: 'collections.get',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(removedInviteeResult.ok).toBe(false);
    expect(removedInviteeResult.error?.status).toBe(404);
  });

  it('matches REST visibility behavior for a public collection lookup', async () => {
    installStatefulScenarioService();
    const app = createMcpApp();
    const owner = await createClient(app, TOKENS.owner);
    clients.push(owner);

    const { app: restApp, setAuth } = createRouteTestApp(collectionRoutes);
    setAuth({ user: fixtures.ownerUser, session: fixtures.session });

    const restCreateResponse = await restApp.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        name: 'Parity Collection',
        description: 'REST and MCP should agree',
        visibility: 'PUBLIC',
      }),
    });
    expect(restCreateResponse.status).toBe(201);

    setAuth({ user: null, session: null });
    const restGetResponse = await restApp.request(`/${ids.collectionId}`);
    const restBody: any = await restGetResponse.json();
    expect(restGetResponse.status).toBe(200);

    const mcpResult = getEnvelope(await owner.client.callTool({
      name: 'collections.get',
      arguments: { collectionId: ids.collectionId },
    }));
    expect(mcpResult.ok).toBe(true);
    expect(mcpResult.data.name).toBe(restBody.name);
  });

});
