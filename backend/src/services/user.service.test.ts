import { beforeEach, describe, expect, it, mock } from 'bun:test';

const USER_SERVICE_MODULE = './user.service?unit';

const prismaMock = {
  user: {
    findUnique: mock(async (): Promise<any> => null),
    update: mock(async (): Promise<any> => ({
      id: 'user-1',
      name: 'User',
      email: 'user@example.com',
      emailVerified: true,
      image: null,
      username: 'user',
      displayUsername: 'User',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })),
  },
  collection: {
    findMany: mock(async (): Promise<any> => []),
  },
};

mock.module('../db', () => ({
  default: prismaMock,
}));

describe('userService', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.collection.findMany.mockReset();
  });

  it('returns null when user is not found', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const { userService } = await import(USER_SERVICE_MODULE);
    const result = await userService.getById('missing-user');

    expect(result).toBeNull();
  });

  it('returns public user fields without emailVerified', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      name: 'User',
      email: 'user@example.com',
      emailVerified: true,
      image: null,
      username: 'user',
      displayUsername: 'User',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const { userService } = await import(USER_SERVICE_MODULE);
    const result = await userService.getById('user-1');

    expect(result).toBeDefined();
    expect((result as any).emailVerified).toBeUndefined();
    expect((result as any).email).toBe('user@example.com');
  });

  it('updates user profile and returns public shape', async () => {
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Updated User',
      email: 'user@example.com',
      emailVerified: true,
      image: null,
      username: 'updated',
      displayUsername: 'Updated User',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const { userService } = await import(USER_SERVICE_MODULE);
    const result = await userService.updateById('user-1', { name: 'Updated User' });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Updated User' },
    });
    expect((result as any).emailVerified).toBeUndefined();
    expect((result as any).name).toBe('Updated User');
  });

  it('queries only public collections for the user', async () => {
    prismaMock.collection.findMany.mockResolvedValueOnce([{ id: 'col-1', visibility: 'PUBLIC' }]);

    const { userService } = await import(USER_SERVICE_MODULE);
    const result = await userService.getPublicCollections('user-1');

    expect(prismaMock.collection.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'user-1',
        visibility: 'PUBLIC',
      },
      include: {
        _count: {
          select: {
            media: true,
          },
        },
      },
    });
    expect(result).toHaveLength(1);
  });
});
