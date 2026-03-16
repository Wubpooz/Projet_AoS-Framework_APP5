# Projet APP5 — Architecture Orientée Services

A REST API backend for managing cross-platform media watch lists. Users can create collections of movies, shows, books, or articles, share them with others, and manage who can view or edit them.


## What's been built

- **Authentication** — register, login, logout, forgot/reset password via [Better Auth](https://github.com/better-auth/better-auth). Session tokens are returned in the `set-auth-token` response header.
- **Users** — profile read/update, public user lookup.
- **Media** — full CRUD with access control. Only the creator can modify or delete their entries.
- **Collections** — create/list/get/update/delete, with public or private visibility. Supports pagination, tag filtering, and title search.
- **Roles & invitations** — collection owners can invite users as `COLLABORATOR` or `READER`. Invitees accept or decline via a dedicated endpoint. Owners can change roles or remove members at any time.
- **MCP server** — stateless HTTP `/mcp` transport plus a stdio entrypoint that reuses the existing collection, media, and user services with per-call bearer-token auth.
- **OpenAPI spec** — auto-generated and served at `/openapi` (JSON) and `/docs` (Scalar UI).
- **Rate limiting** — basic rate limiter on all routes.

The API is not yet dockerized and there is no front-end. See the progress tracking section at the bottom.

---

## Stack

| Layer | Tool |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Hono](https://hono.dev) |
| Validation | [Zod](https://zod.dev) |
| ORM | [Prisma](https://www.prisma.io) |
| Database | PostgreSQL 16 |
| Auth | [Better Auth](https://github.com/better-auth/better-auth) |

---

## Getting Started

**Prerequisites:** Bun and Docker (for Postgres).

```bash
# 1. Clone and install
git clone <repo-url>
bun install

# 2. Start Postgres
docker run --name aos-postgres \
  -e POSTGRES_USER=johndoe \
  -e POSTGRES_PASSWORD=randompassword \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 -d postgres:16

# If it already exists:
docker start aos-postgres

# 3. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum update DATABASE_URL
# MCP is enabled by default outside production; set MCP_ENABLED=true explicitly in prod when you are ready

# 4. Set up the database
bun run prisma:generate
bun run prisma:migrate
bun run prisma:seed

# 5. Start the dev server
bun run dev
```

The server runs on `http://localhost:3000` by default. If Postgres isn't reachable, startup logs `dbConnection: "error"` but the process still starts.

> **Note:** Bun looks for `.env` in the current working directory. If you run commands from the repo root, either copy `backend/.env` to `.env` at the root, or export `DATABASE_URL` in your shell beforehand.

---

## Running Tests

Tests use Bun's built-in test runner. Each route file has a corresponding `.test.ts` file.

```bash
# Run all tests
bun test

# Run tests for a specific route
bun test backend/src/routes/collection.routes.test.ts

# Run only MCP tests
bun run mcp:test

# Watch mode
bun test --watch
```

Tests spin up the Hono app in-process and hit it with `app.request(...)`, so no running server or database is needed — they're fully self-contained.

---

## API Documentation

Once the server is running:

- **Scalar UI:** `http://localhost:3000/docs`
- **Raw OpenAPI JSON:** `http://localhost:3000/openapi`
- **Static copy:** `docs/openapi.yml`

MCP uses its own protocol surface rather than OpenAPI. See `docs/mcp.md` for tool names, auth expectations, and transport details.

---

## MCP

The backend now exposes a Model Context Protocol server that reuses the same service-layer business logic as the REST routes.

### Transports

- **HTTP / Streamable HTTP:** `http://localhost:3000/mcp`
- **stdio:** `bun run mcp:stdio`

### Feature flag

Set `MCP_ENABLED=true` to expose the MCP server. In this repository it defaults to:

- `true` in non-production environments
- `false` in production unless explicitly enabled

### Authentication

- Public read tools can be called anonymously.
- Protected tools require a bearer token on each call.
- The MCP auth bridge uses the same Better Auth session resolution logic as the REST app and prefers `Authorization: Bearer ...` over cookies when both are present.

### Tool naming

Tools are domain-prefixed for predictable prompting, for example:

- `collections.list`
- `collections.inviteMember`
- `media.create`
- `users.getMe`

### Quick start

1. Start the backend with `bun run dev`.
2. Point your MCP client to `http://localhost:3000/mcp`.
3. Include a bearer token for protected tools.
4. Use `bun run mcp:stdio` for local assistant integrations that prefer stdio.

Additional setup notes, example calls, and rollout guidance live in `docs/mcp.md`.

---

## Postman

The `postman/` folder contains everything needed to test the API manually.

### Collections

Import the collection from `postman/collections/New Collection/` into Postman (File → Import, select the folder). The collection is organized into folders:

| Folder | What it covers |
|---|---|
| Auth | Register, login, logout, password reset |
| Users | Profile read/update, public lookup |
| Media | CRUD for media items |
| Collections | CRUD, media linking, members, invitations |
| System | Health check, OpenAPI |

### Environment

Import `postman/environments/Media Collection API.yaml`. It pre-fills `baseUrl`, test user credentials, and empty slots for `ownerToken`, `inviteeToken`, `collectionId`, etc. that get populated by request scripts as you run through the collection.

### Scenario testing (recommended)

The easiest and most maintainable way to run end-to-end scenarios is to reuse the existing Postman requests in sequence.

See `docs/postman-testing-guide.md` for three ready-to-run scenario playbooks:

- **01 Public Collection Lifecycle**
- **02 Private Invitation Acceptance**
- **03 Role Downgrade And Removal**

These scenarios reuse the current request scripts, which already persist tokens and IDs in collection variables such as `ownerToken`, `inviteeToken`, `collectionId`, and `memberId`.

If you want a one-click Collection Runner workflow, use the prebuilt scenario folders under `postman/collections/New Collection/Scenarios/`.

### Flows (optional)

Three experimental scenario flows are also kept in `postman/flows/` as reference material for Postman Local View.

They are useful for visual exploration, but the standard request-sequence approach in `docs/postman-testing-guide.md` is the preferred workflow for day-to-day testing and maintenance.

---

## Updating the Schema

```bash
# After editing backend/prisma/schema.prisma:
bun run prisma:generate   # regenerate the client
bun run prisma:migrate    # apply changes to the DB
bun run prisma:seed       # optional: re-seed
```

---

## Progress

### P1
- [x] Database schema and seeding
- [x] Auth endpoints (register / login / logout / forgot / reset / me)
- [x] Users — read, update, public lookup
- [x] Media — CRUD with access control
- [x] Collections — CRUD + media linking + member/invitation management
- [x] MCP server for collections/media/users collaboration workflows
- [x] Pagination, filtering, sorting on listing endpoints
- [x] Zod validation on all request bodies and query params
- [x] Better Auth integration
- [x] OpenAPI spec (served live + static copy)
- [x] Rate limiting
- [ ] Docker setup
- [x] Postman collection + flows

### P2
- [ ] Fine-grained access control (collaborators vs readers already implemented at API level, needs review)
- [ ] Regex title filtering
- [ ] Multi-tag filtering
- [ ] Media ratings

### P3 (bonus)
- [ ] Sub-collections
- [ ] Watch priority
- [x] CI/CD
- [ ] Front-end

### P4 (bonus bonus)
- [ ] Tag/rating-based recommendations
- [ ] External API integrations (IMDb, Goodreads, etc.)

---

## DataModel
**Media** (films, séries, livres, articles, etc.) avec des champs tels que:  
- Titre *string*
- Description/synopsis *string*
- Type *enum* (film, série, livre, article, etc.)
- Genre(s) *string list* (ex: "sci-fi", "drame", "comédie", etc.)
- Année de sortie *date*
- Réalisateur/Auteur *string*
- Tags *string list* (ex: "sci-fi", "drame", "comédie", etc.)
- Availability/plateforme *string list* (ex: Netflix, Amazon Prime, etc.)
- Scores/notes *string* (ex: IMDb, Rotten Tomatoes, etc.)

**Collections** (watch lists) avec des champs tels que:  
- Nom de la collection  *string*
- Description *string*
- Tags *string list* (ex: "films à voir", "séries à binge-watcher", etc.)
- Date de création *date*
- Date de mise à jour *date*
- Visibilité *enum* (publique/privée)
- Owner *User* clé étrangère (relation vers l'utilisateur qui a créé la collection)


**Users** avec des champs tels que :  
- Nom d'utilisateur *string*
- Email *string*
...


**Associations:**  
- Media 0-n Collections
- Collection 0-n Media
- User 0-n Collections
- Collection 0-n Users (collaborateurs/lecteurs) - table intermédiaire
