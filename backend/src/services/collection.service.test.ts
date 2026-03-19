import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AppError } from '@/middleware/errorHandler';

const COLLECTION_SERVICE_MODULE = './collection.service?unit';

const prismaMock = {
  collection: {
    findUnique: mock(async (): Promise<any> => null),
  },
};

mock.module('@/db', () => ({
  default: prismaMock,
}));

describe('collectionService', () => {
  beforeEach(() => {
    prismaMock.collection.findUnique.mockReset();
  });

  it('builds collection where clause from tags and search query', async () => {
    const { collectionService } = await import(COLLECTION_SERVICE_MODULE);

    const where = collectionService.buildWhereClause({
      tags: 'favorites, movies',
      q: 'sci-fi',
    } as any) as any;

    expect(where.tags).toEqual({ hasSome: ['favorites', 'movies'] });
    expect(where.OR).toHaveLength(2);
  });

  it('throws 404 when collection is missing in role check', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce(null);

    const { collectionService } = await import(COLLECTION_SERVICE_MODULE);
    const promise = collectionService.requireCollectionRole('col-1', 'user-1', ['OWNER'] as any);
    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({ statusCode: 404 });
  });

  it('allows owner when OWNER role is accepted', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'user-1',
      members: [],
    });

    const { collectionService } = await import(COLLECTION_SERVICE_MODULE);

    await expect(collectionService.requireCollectionRole('col-1', 'user-1', ['OWNER'] as any)).resolves.toBeUndefined();
  });

  it('allows accepted collaborator when collaborator role is accepted', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'owner-1',
      members: [{ role: 'COLLABORATOR' }],
    });

    const { collectionService } = await import(COLLECTION_SERVICE_MODULE);

    await expect(collectionService.requireCollectionRole('col-1', 'user-1', ['COLLABORATOR'] as any)).resolves.toBeUndefined();
  });

  it('throws 403 when user lacks required role', async () => {
    prismaMock.collection.findUnique.mockResolvedValueOnce({
      id: 'col-1',
      ownerId: 'owner-1',
      members: [{ role: 'READER' }],
    });

    const { collectionService } = await import(COLLECTION_SERVICE_MODULE);

    await expect(collectionService.requireCollectionRole('col-1', 'user-1', ['OWNER', 'COLLABORATOR'] as any)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });
  });
});
