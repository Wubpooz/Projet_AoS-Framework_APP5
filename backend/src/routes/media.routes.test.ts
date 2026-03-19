import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRouteTestApp, fixtures, ids, jsonHeaders } from '../test/route-test-utils';

const mediaService: any = {
  createMedia: async () => fixtures.media,
  listMedia: async () => ({ ...fixtures.paginatedMedia, data: [fixtures.media], total: 1, pages: 1 }),
  getById: async () => fixtures.media,
  updateById: async () => fixtures.media,
  deleteById: async () => true,
};

mock.module('@/services/media.service', () => ({ mediaService }));

const { mediaRoutes } = await import('./media.routes');

describe('mediaRoutes', () => {
  beforeEach(() => {
    mediaService.createMedia = async () => fixtures.media;
    mediaService.listMedia = async () => ({ ...fixtures.paginatedMedia, data: [fixtures.media], total: 1, pages: 1 });
    mediaService.getById = async () => fixtures.media;
    mediaService.updateById = async () => fixtures.media;
    mediaService.deleteById = async () => true;
  });

  it('requires authentication to create media', async () => {
    const { app } = createRouteTestApp(mediaRoutes);

    const response = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ title: 'Inception', type: 'FILM' }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('creates media for an authenticated user', async () => {
    const { app } = createRouteTestApp(mediaRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request('/', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        collectionId: ids.collectionId,
        title: 'Inception',
        type: 'FILM',
        tags: ['sci-fi'],
      }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe(ids.mediaId);
  });

  it('lists media with filters and pagination', async () => {
    const { app } = createRouteTestApp(mediaRoutes);

    const response = await app.request('/?page=1&pageSize=20&q=inception');
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ids.mediaId);
  });

  it('returns 404 when a media item is not found', async () => {
    mediaService.getById = async () => null;
    const { app } = createRouteTestApp(mediaRoutes);

    const response = await app.request(`/${ids.mediaId}`);
    const body: any = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Media not found' });
  });

  it('rejects empty patch payloads', async () => {
    const { app } = createRouteTestApp(mediaRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.mediaId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    });
    const body: any = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'No fields to update' });
  });

  it('updates media for an authorized user', async () => {
    mediaService.updateById = async () => ({ ...fixtures.media, title: 'Updated title' });
    const { app } = createRouteTestApp(mediaRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.mediaId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ title: 'Updated title' }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe('Updated title');
  });

  it('deletes media for an authorized user', async () => {
    const { app } = createRouteTestApp(mediaRoutes, {
      user: fixtures.ownerUser,
      session: fixtures.session,
    });

    const response = await app.request(`/${ids.mediaId}`, {
      method: 'DELETE',
    });
    const body: any = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Media deleted successfully' });
  });

});
