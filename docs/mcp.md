# MCP server guide
> This backend exposes a production-oriented Model Context Protocol (MCP) surface that reuses the existing AoS service layer instead of duplicating business logic.

&nbsp;  
## What it exposes
The MCP server currently is basically a wrapper for the REST API's service layer, so it exposes tools that mirror the REST API's core capabilities around:  
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



&nbsp;  
## Transport endpoints
### HTTP / Streamable HTTP
- Endpoint: `http://localhost:3000/mcp`
- Runtime: same Bun + Hono backend process as the REST API
- Transport: MCP Streamable HTTP via the official SDK Web-standard server transport

### stdio
- Command: `bun run mcp:stdio`
- Use this for local assistant tooling that expects a stdio MCP server instead of HTTP


&nbsp;  

## Authentication model
Authentication is evaluated on each tool call.

- Public read tools may be called anonymously.
- Protected tools require `Authorization: Bearer <token>` on the request.
- The MCP auth bridge uses the same Better Auth session lookup pattern as the REST app.
- When both a cookie and bearer token are present, bearer auth wins to match the existing backend behavior.


&nbsp;  
## Current v1 limits
- no auth lifecycle tools such as register/login/reset password
- no admin or maintenance tools
- stateless HTTP transport first; separate-process deployment remains a later extraction option



&nbsp;  
## Feature flag
Use `MCP_ENABLED` to control rollout.

Recommended default:
- local/dev: enabled
- production: disabled until explicitly enabled


&nbsp;  
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
**Requires bearer token.**

Example arguments:
```json
{
  "name": "Favorites",
  "description": "Shared favorites",
  "tags": ["favorites", "movies"],
  "visibility": "PUBLIC"
}
```


&nbsp;  
## Response shape
Tools return a stable envelope in `structuredContent` and mirror it in a text content item for compatibility.
- Success shape:
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

- Error shape:
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


