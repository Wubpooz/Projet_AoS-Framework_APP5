import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';
import { collectionService as defaultCollectionService } from '@/services/collection.service';
import { mediaService as defaultMediaService } from '@/services/media.service';
import { userService as defaultUserService } from '@/services/user.service';
import { AppError, resolveApiErrorStatus } from '@/middleware/errorHandler';
import { customLogger } from '@/middleware/requestLogger';
import { resolveMcpSessionFromHeaders, type McpResolvedSession } from './auth';
import {
  mcpAddCollectionMediaSchema,
  mcpAddCollectionMemberSchema,
  mcpCollectionIdSchema,
  mcpCollectionMediaIdSchema,
  mcpCollectionMemberIdSchema,
  mcpCreateCollectionSchema,
  mcpCreateMediaSchema,
  mcpListCollectionsSchema,
  mcpListMediaSchema,
  mcpMediaIdSchema,
  mcpRespondToInvitationSchema,
  mcpToolEnvelopeSchema,
  mcpUpdateCollectionMediaSchema,
  mcpUpdateCollectionMemberSchema,
  mcpUpdateCollectionSchema,
  mcpUpdateMediaSchema,
  mcpUpdateOwnProfileSchema,
  mcpUserIdSchema,
} from './schemas';

export type McpDependencies = {
  collectionService: typeof defaultCollectionService;
  mediaService: typeof defaultMediaService;
  userService: typeof defaultUserService;
  resolveSession: typeof resolveMcpSessionFromHeaders;
  log: (message: string, ...rest: string[]) => void;
};

type RegisteredToolExtra = RequestHandlerExtra<any, any>;

type ToolRequestMeta = {
  requestId: string | number;
  authenticated: boolean;
  userId?: string;
};

type ToolRuntime = {
  auth: McpResolvedSession;
  meta: ToolRequestMeta;
  requireUser: () => string;
};

type ToolConfig = {
  title: string;
  description: string;
  inputSchema?: any;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    title?: string;
  };
  requireAuth?: boolean;
};

const defaultDependencies: McpDependencies = {
  collectionService: defaultCollectionService,
  mediaService: defaultMediaService,
  userService: defaultUserService,
  resolveSession: resolveMcpSessionFromHeaders,
  log: customLogger,
};

const emptyToolInputSchema = z.object({}).strict();

const serializeEnvelope = (payload: unknown) => JSON.stringify(payload, null, 2);

const createSuccessResult = (tool: string, data: unknown, meta: ToolRequestMeta) => {
  const envelope = {
    ok: true,
    tool,
    data,
    meta,
  };

  return {
    content: [{ type: 'text' as const, text: serializeEnvelope(envelope) }],
    structuredContent: envelope,
  };
};

const toErrorCode = (status: number, error: unknown) => {
  if (error instanceof AppError) {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'APP_ERROR';
    }
  }

  return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'MCP_TOOL_ERROR';
};

const createErrorResult = (tool: string, error: unknown, meta: ToolRequestMeta) => {
  const status = resolveApiErrorStatus(error);
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const envelope = {
    ok: false,
    tool,
    error: {
      code: toErrorCode(status, error),
      message,
      status,
    },
    meta,
  };

  return {
    content: [{ type: 'text' as const, text: serializeEnvelope(envelope) }],
    structuredContent: envelope,
    isError: true,
  };
};

const createToolLogger = (deps: McpDependencies, toolName: string, meta: ToolRequestMeta) => {
  return (outcome: 'success' | 'error', startedAt: number, extra?: Record<string, unknown>) => {
    const latencyMs = Math.round(performance.now() - startedAt);
    const segments = [
      '[mcp]',
      `tool=${toolName}`,
      `requestId=${String(meta.requestId)}`,
      `userId=${meta.userId ?? 'anonymous'}`,
      `outcome=${outcome}`,
      `latencyMs=${latencyMs}`,
    ];

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined) {
          segments.push(`${key}=${String(value)}`);
        }
      }
    }

    deps.log(segments.join(' '));
  };
};

const getToolMeta = (auth: McpResolvedSession, requestId: string | number): ToolRequestMeta => ({
  requestId,
  authenticated: Boolean(auth.user),
  userId: auth.user?.id,
});

const normalizeRequestId = (requestId: unknown): string | number => {
  if (typeof requestId === 'number' || typeof requestId === 'string') {
    return requestId;
  }

  return 'unknown';
};

export function createAosMcpServer(overrides: Partial<McpDependencies> = {}) {
  const deps: McpDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  const server = new McpServer({
    name: 'aos-backend-mcp',
    version: '1.0.0',
  }, {
    capabilities: {
      logging: {},
    },
  });

  const registerTool = <TArgs>(
    name: string,
    config: ToolConfig,
    handler: (args: TArgs, runtime: ToolRuntime) => Promise<unknown>,
  ) => {
    server.registerTool(name, {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: mcpToolEnvelopeSchema,
      annotations: config.annotations,
      _meta: {
        authRequired: config.requireAuth ?? false,
      },
    }, async (args: TArgs, extra: RegisteredToolExtra) => {
      const startedAt = performance.now();
      const auth = await deps.resolveSession(extra.requestInfo?.headers as any);
      const meta = getToolMeta(auth, normalizeRequestId(extra.requestId));
      const logOutcome = createToolLogger(deps, name, meta);

      try {
        if (config.requireAuth && !auth.user) {
          throw new AppError('Unauthorized', 401);
        }

        const data = await handler(args, {
          auth,
          meta,
          requireUser: () => {
            if (!auth.user) {
              throw new AppError('Unauthorized', 401);
            }

            return auth.user.id;
          },
        });

        logOutcome('success', startedAt);
        return createSuccessResult(name, data, meta);
      } catch (error) {
        const status = resolveApiErrorStatus(error);
        logOutcome('error', startedAt, { status });
        return createErrorResult(name, error, meta);
      }
    });
  };

  registerTool('collections.list', {
    title: 'List collections',
    description: 'List collections using the same pagination, filtering, and access semantics as the REST API.',
    inputSchema: mcpListCollectionsSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (args, runtime) => deps.collectionService.listCollections(args as any, runtime.auth.user?.id));

  registerTool('collections.get', {
    title: 'Get collection',
    description: 'Get a collection by ID, honoring public visibility and membership access.',
    inputSchema: mcpCollectionIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs, runtime) => {
    const { collectionId } = rawArgs as { collectionId: string };
    const collection = await deps.collectionService.getById(collectionId, runtime.auth.user?.id);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }

    return collection;
  });

  registerTool('collections.create', {
    title: 'Create collection',
    description: 'Create a collection for the authenticated user.',
    inputSchema: mcpCreateCollectionSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    requireAuth: true,
  }, async (args, runtime) => deps.collectionService.createCollection(args as any, runtime.requireUser()));

  registerTool('collections.update', {
    title: 'Update collection',
    description: 'Update collection metadata for an owner-managed collection.',
    inputSchema: mcpUpdateCollectionSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, ...data } = rawArgs as { collectionId: string } & Record<string, unknown>;
    const collection = await deps.collectionService.updateById(collectionId, data as any, runtime.requireUser());
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }

    return collection;
  });

  registerTool('collections.delete', {
    title: 'Delete collection',
    description: 'Delete a collection owned by the authenticated user.',
    inputSchema: mcpCollectionIdSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId } = rawArgs as { collectionId: string };
    const deleted = await deps.collectionService.deleteById(collectionId, runtime.requireUser());
    if (!deleted) {
      throw new AppError('Collection not found', 404);
    }

    return { deleted };
  });

  registerTool('collections.listMedia', {
    title: 'List collection media',
    description: 'List media linked to a collection in its current display order.',
    inputSchema: mcpCollectionIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs, runtime) => {
    const { collectionId } = rawArgs as { collectionId: string };
    return deps.collectionService.listCollectionMedia(collectionId, runtime.auth.user?.id);
  });

  registerTool('collections.addMedia', {
    title: 'Add media to collection',
    description: 'Add an existing media item to a collection.',
    inputSchema: mcpAddCollectionMediaSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, mediaId, position } = rawArgs as { collectionId: string; mediaId: string; position?: number };
    return deps.collectionService.addMediaToCollection(collectionId, mediaId, position ?? 0, runtime.requireUser());
  });

  registerTool('collections.updateMedia', {
    title: 'Update collection media',
    description: 'Update collection-specific media metadata such as position.',
    inputSchema: mcpUpdateCollectionMediaSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, collectionMediaId, ...data } = rawArgs as { collectionId: string; collectionMediaId: string } & Record<string, unknown>;
    const collectionMedia = await deps.collectionService.updateCollectionMedia(collectionId, collectionMediaId, data as any, runtime.requireUser());
    if (!collectionMedia) {
      throw new AppError('Collection media not found', 404);
    }

    return collectionMedia;
  });

  registerTool('collections.removeMedia', {
    title: 'Remove media from collection',
    description: 'Remove a media link from a collection.',
    inputSchema: mcpCollectionMediaIdSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, collectionMediaId } = rawArgs as { collectionId: string; collectionMediaId: string };
    const deleted = await deps.collectionService.removeMediaFromCollection(collectionId, collectionMediaId, runtime.requireUser());
    if (!deleted) {
      throw new AppError('Collection media not found', 404);
    }

    return { deleted };
  });

  registerTool('collections.listMembers', {
    title: 'List collection members',
    description: 'List members for a collection when the caller has access to view it.',
    inputSchema: mcpCollectionIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs, runtime) => {
    const { collectionId } = rawArgs as { collectionId: string };
    return deps.collectionService.listCollectionMembers(collectionId, runtime.auth.user?.id);
  });

  registerTool('collections.inviteMember', {
    title: 'Invite collection member',
    description: 'Invite a user to a collection as READER or COLLABORATOR.',
    inputSchema: mcpAddCollectionMemberSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, userId, role } = rawArgs as { collectionId: string; userId: string; role: any };
    return deps.collectionService.addMemberToCollection(collectionId, userId, role, runtime.requireUser());
  });

  registerTool('collections.updateMember', {
    title: 'Update collection member',
    description: 'Update member role or acceptance state for a collection member.',
    inputSchema: mcpUpdateCollectionMemberSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, memberId, ...data } = rawArgs as { collectionId: string; memberId: string } & Record<string, unknown>;
    const member = await deps.collectionService.updateCollectionMember(collectionId, memberId, data as any, runtime.requireUser());
    if (!member) {
      throw new AppError('Collection member not found', 404);
    }

    return member;
  });

  registerTool('collections.removeMember', {
    title: 'Remove collection member',
    description: 'Remove a member from a collection.',
    inputSchema: mcpCollectionMemberIdSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, memberId } = rawArgs as { collectionId: string; memberId: string };
    const deleted = await deps.collectionService.removeMemberFromCollection(collectionId, memberId, runtime.requireUser());
    if (!deleted) {
      throw new AppError('Collection member not found', 404);
    }

    return { deleted };
  });

  registerTool('collections.listInvitations', {
    title: 'List collection invitations',
    description: 'List pending collection invitations for the authenticated user.',
    inputSchema: emptyToolInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (_args, runtime) => deps.collectionService.listUserInvitations(runtime.requireUser()));

  registerTool('collections.respondToInvitation', {
    title: 'Respond to invitation',
    description: 'Accept or reject a pending collection invitation.',
    inputSchema: mcpRespondToInvitationSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, accept } = rawArgs as { collectionId: string; accept: boolean };
    const result = await deps.collectionService.respondToInvitation(collectionId, runtime.requireUser(), accept);
    return {
      accepted: accept,
      invitation: result,
    };
  });

  registerTool('media.list', {
    title: 'List media',
    description: 'List media using the same filtering, pagination, and visibility rules as the REST API.',
    inputSchema: mcpListMediaSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (args, runtime) => deps.mediaService.listMedia(args as any, runtime.auth.user?.id));

  registerTool('media.get', {
    title: 'Get media',
    description: 'Get a media item by ID with the same visibility rules as the REST API.',
    inputSchema: mcpMediaIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs, runtime) => {
    const { mediaId } = rawArgs as { mediaId: string };
    const media = await deps.mediaService.getById(mediaId, runtime.auth.user?.id);
    if (!media) {
      throw new AppError('Media not found', 404);
    }

    return media;
  });

  registerTool('media.create', {
    title: 'Create media',
    description: 'Create a media item and optionally add it to a collection.',
    inputSchema: mcpCreateMediaSchema,
    annotations: { destructiveHint: false, idempotentHint: false },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { collectionId, ...payload } = rawArgs as { collectionId?: string } & Record<string, unknown>;
    return deps.mediaService.createMedia(payload as any, runtime.requireUser(), collectionId);
  });

  registerTool('media.update', {
    title: 'Update media',
    description: 'Update a media item when the caller has the required role.',
    inputSchema: mcpUpdateMediaSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { mediaId, ...payload } = rawArgs as { mediaId: string } & Record<string, unknown>;
    const media = await deps.mediaService.updateById(mediaId, payload as any, runtime.requireUser());
    if (!media) {
      throw new AppError('Media not found', 404);
    }

    return media;
  });

  registerTool('media.delete', {
    title: 'Delete media',
    description: 'Delete a media item when the caller owns a linked collection.',
    inputSchema: mcpMediaIdSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (rawArgs, runtime) => {
    const { mediaId } = rawArgs as { mediaId: string };
    const deleted = await deps.mediaService.deleteById(mediaId, runtime.requireUser());
    if (!deleted) {
      throw new AppError('Media not found', 404);
    }

    return { deleted };
  });

  registerTool('users.getById', {
    title: 'Get public user profile',
    description: 'Get a public user profile by user ID.',
    inputSchema: mcpUserIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs) => {
    const { userId } = rawArgs as { userId: string };
    const user = await deps.userService.getById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return { user };
  });

  registerTool('users.getMe', {
    title: 'Get my profile',
    description: 'Get the authenticated user profile.',
    inputSchema: emptyToolInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    requireAuth: true,
  }, async (_args, runtime) => {
    const user = await deps.userService.getById(runtime.requireUser());
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return { user };
  });

  registerTool('users.updateMe', {
    title: 'Update my profile',
    description: 'Update the authenticated user profile fields managed by the API.',
    inputSchema: mcpUpdateOwnProfileSchema,
    annotations: { destructiveHint: false, idempotentHint: true },
    requireAuth: true,
  }, async (args, runtime) => {
    const user = await deps.userService.updateById(runtime.requireUser(), args as any);
    return { user };
  });

  registerTool('users.getPublicCollections', {
    title: 'Get public collections by user',
    description: 'List the public collections owned by a user.',
    inputSchema: mcpUserIdSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async (rawArgs) => {
    const { userId } = rawArgs as { userId: string };
    return {
      collections: await deps.userService.getPublicCollections(userId),
    };
  });

  return server;
}
