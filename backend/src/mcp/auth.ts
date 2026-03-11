import { auth, type AuthType } from '@/middleware/auth';

export type HeaderSource = Pick<Headers, 'get'> & Partial<Pick<Headers, 'entries' | 'forEach'>>;

export type McpResolvedSession = AuthType & {
  token?: string;
};

const BEARER_PREFIX = 'Bearer ';

const toHeaders = (source: HeaderSource | Headers): Headers => {
  if (source instanceof Headers) {
    return new Headers(source);
  }

  const normalized = new Headers();

  if (typeof source.forEach === 'function') {
    source.forEach((value, key) => {
      normalized.append(key, value);
    });
    return normalized;
  }

  if (typeof source.entries === 'function') {
    for (const [key, value] of source.entries()) {
      normalized.append(key, value);
    }
    return normalized;
  }

  if (typeof source.get === 'function') {
    const authorization = source.get('authorization') ?? source.get('Authorization');
    const cookie = source.get('cookie') ?? source.get('Cookie');

    if (authorization) {
      normalized.set('authorization', authorization);
    }

    if (cookie) {
      normalized.set('cookie', cookie);
    }
  }

  return normalized;
};

export const extractAuthorizationHeader = (headers?: HeaderSource | Headers | null): string | null => {
  if (!headers || (typeof headers.get !== 'function')) {
    return null;
  }

  return headers.get('authorization') ?? headers.get('Authorization') ?? null;
};

export const extractBearerToken = (headers?: HeaderSource | Headers | null): string | undefined => {
  const authorizationHeader = extractAuthorizationHeader(headers);
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  return authorizationHeader.slice(BEARER_PREFIX.length).trim() || undefined;
};

export async function resolveMcpSessionFromHeaders(headers?: HeaderSource | Headers | null): Promise<McpResolvedSession> {
  const authorizationHeader = extractAuthorizationHeader(headers);

  if (!headers && !authorizationHeader) {
    return { user: null, session: null };
  }

  const normalizedHeaders = toHeaders(headers ?? new Headers());
  let resolvedSession;

  if (authorizationHeader?.startsWith(BEARER_PREFIX)) {
    const bearerOnlyHeaders = new Headers();
    bearerOnlyHeaders.set('authorization', authorizationHeader);
    resolvedSession = await auth.api.getSession({
      headers: bearerOnlyHeaders,
    });
  } else {
    resolvedSession = await auth.api.getSession({
      headers: normalizedHeaders,
    });
  }

  if (!resolvedSession) {
    return {
      user: null,
      session: null,
      token: extractBearerToken(headers),
    };
  }

  return {
    user: resolvedSession.user,
    session: resolvedSession.session,
    token: extractBearerToken(headers),
  };
}
