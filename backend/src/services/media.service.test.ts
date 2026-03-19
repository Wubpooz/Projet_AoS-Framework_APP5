import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AppError } from '@/middleware/errorHandler';

const MEDIA_SERVICE_MODULE = './media.service?unit';

const prismaMock = {
  collection: {
    findUnique: mock(async (): Promise<any> => null),
    findFirst: mock(async (): Promise<any> => null),
    create: mock(async (): Promise<any> => ({ id: 'default-col' })),
  },
  media: {
    findUnique: mock(async (): Promise<any> => null),
  },
  $transaction: mock(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
};

mock.module('@/db', () => ({
  default: prismaMock,
}));

describe('mediaService', () => {
  beforeEach(() => {
    prismaMock.collection.findUnique.mockReset();
    prismaMock.collection.findFirst.mockReset();
    prismaMock.collection.create.mockReset();
    prismaMock.media.findUnique.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(prismaMock));
  });

  it('builds media where clause from query filters', async () => {
    const { mediaService } = await import(MEDIA_SERVICE_MODULE);

    const where = mediaService.buildWhereClause({
      type: 'FILM',
      tags: 'sci-fi,thriller',
      platforms: 'Netflix,Prime',
      q: 'inception',
    } as any) as any;

    expect(where.type).toBe('FILM');
    expect(where.tags).toEqual({ hasSome: ['sci-fi', 'thriller'] });
    expect(where.platforms).toEqual({ hasSome: ['Netflix', 'Prime'] });
    expect(where.OR).toHaveLength(2);
  });

  it('returns existing default collection when present', async () => {
    prismaMock.collection.findFirst.mockResolvedValueOnce({ id: 'existing-default' });

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);
    const result = await mediaService.getOrCreateDefaultCollection('user-1');

    expect(result).toEqual({ id: 'existing-default' });
    expect(prismaMock.collection.create).not.toHaveBeenCalled();
  });

  it('creates default collection when missing', async () => {
    prismaMock.collection.findFirst.mockResolvedValueOnce(null);
    prismaMock.collection.create.mockResolvedValueOnce({ id: 'created-default' });

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);
    const result = await mediaService.getOrCreateDefaultCollection('user-1');

    expect(prismaMock.collection.create).toHaveBeenCalledWith({
      data: {
        name: 'Default',
        description: 'Default collection',
        tags: [],
        visibility: 'PRIVATE',
        ownerId: 'user-1',
      },
      select: { id: true },
    });
    expect(result).toEqual({ id: 'created-default' });
  });

  it('throws 404 when target collection does not exist for media creation', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce(null);

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);
    const promise = mediaService.getCollectionForCreate('user-1', 'missing-col');

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({ statusCode: 404 });
  });

  it('allows owner to create media in owned collection', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'user-1',
      members: [],
    });

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);
    const result = await mediaService.getCollectionForCreate('user-1', 'col-1');

    expect(result).toEqual({ id: 'col-1' });
  });

  it('allows collaborator to create media in shared collection', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'owner-1',
      members: [{ role: 'COLLABORATOR' }],
    });

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);
    const result = await mediaService.getCollectionForCreate('user-1', 'col-1');

    expect(result).toEqual({ id: 'col-1' });
  });

  it('rejects readers from creating media in shared collection', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'owner-1',
      members: [{ role: 'READER' }],
    });

    const { mediaService } = await import(MEDIA_SERVICE_MODULE);

    await expect(mediaService.getCollectionForCreate('user-1', 'col-1')).rejects.toMatchObject({ statusCode: 403, message: 'Forbidden' });
  });
});
