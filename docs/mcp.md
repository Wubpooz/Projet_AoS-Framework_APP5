# MCP server guide

This backend exposes a production-oriented Model Context Protocol (MCP) surface that reuses the existing AoS service layer instead of duplicating business logic.

## What it exposes

The MCP server currently focuses on high-value collection, media, and user workflows:

- collection listing and lookup
- collection CRUD
- collection media linking and ordering updates
- member invitation, role update, and removal workflows
- invitation listing and acceptance / rejection
- media listing and CRUD
- public user lookup, self-profile reads/updates, and public collection lookup

Tool names are domain-prefixed, for example:

- `collections.list`
- `collections.get`
- `collections.inviteMember`
- `collections.respondToInvitation`
- `media.create`
- `users.getMe`

## Transport endpoints

### HTTP / Streamable HTTP

- Endpoint: `http://localhost:3000/mcp`
- Runtime: same Bun + Hono backend process as the REST API
- Transport: MCP Streamable HTTP via the official SDK Web-standard server transport

### stdio

- Command: `bun run mcp:stdio`
- Use this for local assistant tooling that expects a stdio MCP server instead of HTTP

## Authentication model

Authentication is evaluated on each tool call.

- Public read tools may be called anonymously.
- Protected tools require `Authorization: Bearer <token>` on the request.
- The MCP auth bridge uses the same Better Auth session lookup pattern as the REST app.
- When both a cookie and bearer token are present, bearer auth wins to match the existing backend behavior.

## Feature flag

Use `MCP_ENABLED` to control rollout.

Recommended default:

- local/dev: enabled
- production: disabled until explicitly enabled

Example:

- `MCP_ENABLED=true`

## Example tool calls

The exact JSON-RPC envelope depends on the MCP client, but these examples show the tool names and arguments you should expect to send.

### List collections anonymously

Tool: `collections.list`

Arguments:

- `page`
- `pageSize`
- `tag` or `tags`
- `q`
- `sort`
- `order`
- `cursor`

Example arguments:

```json
{
  "page": 1,
  "pageSize": 20,
  "q": "favorites"
}
```

### Create a collection

Tool: `collections.create`

Requires bearer token.

```json
{
  "name": "Favorites",
  "description": "Shared favorites",
  "tags": ["favorites", "movies"],
  "visibility": "PUBLIC"
}
```

### Invite a member

Tool: `collections.inviteMember`

Requires bearer token.

```json
{
  "collectionId": "33333333-3333-4333-8333-333333333333",
  "userId": "22222222-2222-4222-8222-222222222222",
  "role": "COLLABORATOR"
}
```

### Accept an invitation

Tool: `collections.respondToInvitation`

Requires bearer token for the invited user.

```json
{
  "collectionId": "33333333-3333-4333-8333-333333333333",
  "accept": true
}
```

## Response shape

Tools return a stable envelope in `structuredContent` and mirror it in a text content item for compatibility.

Success shape:

```json
{
  "ok": true,
  "tool": "collections.list",
  "data": {},
  "meta": {
    "requestId": 1,
    "authenticated": false
  }
}
```

Error shape:

```json
{
  "ok": false,
  "tool": "collections.create",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "status": 401
  },
  "meta": {
    "requestId": 2,
    "authenticated": false
  }
}
```

## Logging

Each MCP tool call is logged with:

- tool name
- request ID
- resolved user ID when available
- latency
- outcome

This keeps MCP traffic aligned with the backend's existing operational logging style.

## Validation and safety

The MCP layer reuses the existing Zod request schemas where possible and adds transport-focused constraints for:

- empty patch rejection
- bounded IDs and search strings
- bounded comma-separated tag/platform query inputs

## Verification checklist

When enabling MCP in a new environment, verify:

1. `GET /health` reports MCP enabled as expected.
2. anonymous read tools work only for public data.
3. protected tools reject missing or invalid bearer tokens.
4. owner / collaborator / reader behavior matches the REST API.
5. stdio startup works with `bun run mcp:stdio`.

## Current v1 limits

- no auth lifecycle tools such as register/login/reset password
- no admin or maintenance tools
- stateless HTTP transport first; separate-process deployment remains a later extraction option

## Suggested rollout

1. Enable locally and validate the role matrix.
2. Compare selected REST and MCP operations for parity.
3. Expose in shared environments behind `MCP_ENABLED=true`.
4. Add client-specific smoke scripts if your team standardizes on one MCP consumer.
