import { describe, expect, it } from 'bun:test';
import { queryUtils } from './query.utils';

describe('queryUtils', () => {
  it('parses comma-separated strings and trims empty entries', () => {
    expect(queryUtils.parseCommaSeparated(' sci-fi, drama , , thriller ')).toEqual(['sci-fi', 'drama', 'thriller']);
  });

  it('falls back to a single value when comma-separated input is absent', () => {
    expect(queryUtils.parseCommaSeparated(undefined, 'single-tag')).toEqual(['single-tag']);
    expect(queryUtils.parseCommaSeparated(undefined, undefined)).toEqual([]);
  });

  it('builds base query params from provided filters', () => {
    const params = queryUtils.buildBaseQueryParams({
      type: 'FILM',
      tag: 'classic',
      tags: 'classic,sci-fi',
      platform: 'Netflix',
      platforms: 'Netflix,Prime',
      q: 'inception',
      sort: 'title',
      order: 'asc',
    });

    expect(params.get('type')).toBe('FILM');
    expect(params.get('tag')).toBe('classic');
    expect(params.get('tags')).toBe('classic,sci-fi');
    expect(params.get('platform')).toBe('Netflix');
    expect(params.get('platforms')).toBe('Netflix,Prime');
    expect(params.get('q')).toBe('inception');
    expect(params.get('sort')).toBe('title');
    expect(params.get('order')).toBe('asc');
  });

  it('builds offset-based pagination links', () => {
    const links = queryUtils.buildPaginationLinks(
      '/api/media',
      { q: 'test', sort: 'createdAt', order: 'desc' },
      2,
      20,
      3
    );

    expect(links.self).toContain('/api/media?');
    expect(links.self).toContain('page=2');
    expect(links.self).toContain('pageSize=20');
    expect(links.next).toContain('page=3');
    expect(links.prev).toContain('page=1');
  });

  it('builds cursor-based pagination links', () => {
    const links = queryUtils.buildCursorPaginationLinks(
      '/api/collections',
      { q: 'watchlist', cursor: 'cursor-a' },
      10,
      'cursor-b'
    );

    expect(links.self).toContain('cursor=cursor-a');
    expect(links.self).toContain('pageSize=10');
    expect(links.next).toContain('cursor=cursor-b');
    expect(links.prev).toBeNull();
  });

  it('builds collection access where clauses', () => {
    const publicOnly = queryUtils.buildCollectionAccessWhere();
    expect(publicOnly).toEqual({ visibility: 'PUBLIC' });

    const withUser = queryUtils.buildCollectionAccessWhere('user-1') as any;
    expect(withUser.OR).toHaveLength(2);
    expect(withUser.OR[0]).toEqual({ visibility: 'PUBLIC' });
  });

  it('builds media access where clauses', () => {
    const publicOnly = queryUtils.buildMediaAccessWhere() as any;
    expect(publicOnly.collections.some.collection.visibility).toBe('PUBLIC');

    const withUser = queryUtils.buildMediaAccessWhere('user-1') as any;
    expect(withUser.OR).toHaveLength(2);
  });
});
