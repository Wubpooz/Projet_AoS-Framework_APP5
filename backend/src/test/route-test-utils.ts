import { Hono } from 'hono';
import { errorHandler } from '@/middleware/errorHandler';

export type AuthState = {
  user: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
};

export const ids = {
  ownerUserId: '11111111-1111-4111-8111-111111111111',
  inviteeUserId: '22222222-2222-4222-8222-222222222222',
  collectionId: '33333333-3333-4333-8333-333333333333',
  mediaId: '44444444-4444-4444-8444-444444444444',
  collectionMediaId: '55555555-5555-4555-8555-555555555555',
  memberId: '66666666-6666-4666-8666-666666666666',
};

export const fixtures = {
  ownerUser: {
    id: ids.ownerUserId,
    email: 'owner@example.com',
    name: 'Owner User',
    image: null,
    username: 'owner-user',
    displayUsername: 'Owner User',
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
  },
  inviteeUser: {
    id: ids.inviteeUserId,
    email: 'invitee@example.com',
    name: 'Invitee User',
    image: null,
    username: 'invitee-user',
    displayUsername: 'Invitee User',
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
  },
  session: {
    id: '77777777-7777-4777-8777-777777777777',
    userId: ids.ownerUserId,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
  collection: {
    id: ids.collectionId,
    name: 'Favorites',
    description: 'Shared favorites',
    tags: ['favorites', 'movies'],
    visibility: 'PUBLIC',
    ownerId: ids.ownerUserId,
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
    _count: { media: 1, members: 1 },
  },
  media: {
    id: ids.mediaId,
    title: 'Inception',
    description: 'Dreams within dreams',
    type: 'FILM',
    releaseDate: '2010-07-16T00:00:00.000Z',
    directorAuthor: 'Christopher Nolan',
    tags: ['sci-fi'],
    platforms: ['Netflix'],
    url: 'https://example.com/inception',
    scores: null,
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
    collections: [],
  },
  collectionMedia: {
    id: ids.collectionMediaId,
    position: 1,
    addedAt: '2026-03-10T10:00:00.000Z',
    collectionId: ids.collectionId,
    mediaId: ids.mediaId,
    media: {
      id: ids.mediaId,
      title: 'Inception',
    },
  },
  collectionMember: {
    id: ids.memberId,
    role: 'COLLABORATOR',
    invitedAt: '2026-03-10T10:00:00.000Z',
    accepted: false,
    collectionId: ids.collectionId,
    userId: ids.inviteeUserId,
    user: {
      id: ids.inviteeUserId,
      email: 'invitee@example.com',
      name: 'Invitee User',
    },
  },
  paginatedMedia: {
    data: [],
    page: 1,
    pageSize: 20,
    total: 0,
    pages: 0,
    links: {
      self: '/api/media?page=1&pageSize=20',
      next: null,
      prev: null,
    },
    cursor: null,
  },
  paginatedCollections: {
    data: [],
    page: 1,
    pageSize: 20,
    total: 0,
    pages: 0,
    links: {
      self: '/api/collections?page=1&pageSize=20',
      next: null,
      prev: null,
    },
    cursor: null,
  },
};

export function createRouteTestApp(route: any, initialAuth: Partial<AuthState> = {}) {
  const authState: AuthState = {
    user: null,
    session: null,
    ...initialAuth,
  };

  const app = new Hono();

  app.use('*', async (c, next) => {
    const testContext = c as any;
    testContext.set('user', authState.user);
    testContext.set('session', authState.session);
    await next();
  });

  app.route('/', route);
  app.onError(errorHandler);

  return {
    app,
    setAuth(nextAuth: Partial<AuthState>) {
      authState.user = nextAuth.user ?? null;
      authState.session = nextAuth.session ?? null;
    },
  };
}

export function jsonHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}
