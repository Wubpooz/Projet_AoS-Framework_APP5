import { z } from 'zod';
import {
  addMediaToCollectionSchema,
  addMemberToCollectionSchema,
  createCollectionSchema,
  respondToInvitationSchema,
  updateCollectionMediaSchema,
  updateCollectionMemberSchema,
  updateCollectionSchema,
  getCollectionQuerySchema,
} from '@/schemas/collection.schema';
import {
  createMediaSchema,
  getMediaQuerySchema,
  updateMediaSchema,
} from '@/schemas/media.schema';
import { updateUserSchema } from '@/schemas/user.schema';

const boundedId = z.string().min(1).max(128);
const boundedTag = z.string().max(64);
const boundedCsv = z.string().max(500);
const boundedSearch = z.string().max(200);

const requireUpdateFields = <T extends z.ZodRawShape>(schema: z.ZodObject<T>, exemptKeys: string[]) =>
  schema.superRefine((value, ctx) => {
    const hasUpdates = Object.keys(value).some((key) => !exemptKeys.includes(key) && value[key as keyof typeof value] !== undefined);

    if (!hasUpdates) {
      ctx.addIssue({
        code: 'custom',
        message: 'No fields to update',
      });
    }
  });

export const mcpToolEnvelopeSchema = z.object({
  ok: z.boolean(),
  tool: z.string(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    status: z.number().int(),
  }).optional(),
  meta: z.object({
    requestId: z.union([z.string(), z.number()]).optional(),
    authenticated: z.boolean(),
    userId: z.string().optional(),
  }).optional(),
}).strict();

export const mcpCollectionIdSchema = z.object({
  collectionId: boundedId,
}).strict();

export const mcpCollectionMediaIdSchema = z.object({
  collectionId: boundedId,
  collectionMediaId: boundedId,
}).strict();

export const mcpCollectionMemberIdSchema = z.object({
  collectionId: boundedId,
  memberId: boundedId,
}).strict();

export const mcpListCollectionsSchema = getCollectionQuerySchema.extend({
  tag: boundedTag.optional(),
  tags: boundedCsv.optional(),
  q: boundedSearch.optional(),
  cursor: boundedId.optional(),
}).strict();

export const mcpCreateCollectionSchema = createCollectionSchema.strict();

export const mcpUpdateCollectionSchema = requireUpdateFields(
  updateCollectionSchema.extend({
    collectionId: boundedId,
  }).strict(),
  ['collectionId'],
);

export const mcpAddCollectionMediaSchema = addMediaToCollectionSchema.extend({
  collectionId: boundedId,
}).strict();

export const mcpUpdateCollectionMediaSchema = requireUpdateFields(
  updateCollectionMediaSchema.extend({
    collectionId: boundedId,
    collectionMediaId: boundedId,
  }).strict(),
  ['collectionId', 'collectionMediaId'],
);

export const mcpAddCollectionMemberSchema = addMemberToCollectionSchema.extend({
  collectionId: boundedId,
}).strict();

export const mcpUpdateCollectionMemberSchema = requireUpdateFields(
  updateCollectionMemberSchema.extend({
    collectionId: boundedId,
    memberId: boundedId,
  }).strict(),
  ['collectionId', 'memberId'],
);

export const mcpRespondToInvitationSchema = respondToInvitationSchema.extend({
  collectionId: boundedId,
}).strict();

export const mcpMediaIdSchema = z.object({
  mediaId: boundedId,
}).strict();

export const mcpListMediaSchema = getMediaQuerySchema.extend({
  tag: boundedTag.optional(),
  tags: boundedCsv.optional(),
  platform: boundedTag.optional(),
  platforms: boundedCsv.optional(),
  q: boundedSearch.optional(),
  cursor: boundedId.optional(),
}).strict();

export const mcpCreateMediaSchema = createMediaSchema.strict();

export const mcpUpdateMediaSchema = requireUpdateFields(
  updateMediaSchema.extend({
    mediaId: boundedId,
  }).strict(),
  ['mediaId'],
);

export const mcpUserIdSchema = z.object({
  userId: boundedId,
}).strict();

export const mcpUpdateOwnProfileSchema = requireUpdateFields(
  updateUserSchema.strict(),
  [],
);
