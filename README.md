# Projet APP5 — Architecture Orientée Services

A REST API backend for managing cross-platform media watch lists. Users can create collections of movies, shows, books, or articles, share them with others, and manage who can view or edit them.

## What's been built

- **Authentication** — register, login, logout, forgot/reset password via [Better Auth](https://github.com/better-auth/better-auth). Session tokens are returned in the `set-auth-token` response header.
- **Users** — profile read/update, public user lookup.
- **Media** — full CRUD with access control. Only the creator can modify or delete their entries.
- **Collections** — create/list/get/update/delete, with public or private visibility. Supports pagination, tag filtering, and title search.
- **Roles & invitations** — collection owners can invite users as `COLLABORATOR` or `READER`. Invitees accept or decline via a dedicated endpoint. Owners can change roles or remove members at any time.
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

### Flows (end-to-end scenarios)

Three scenario flows are in `postman/flows/`. Import any of them via File → Import:

**01 Public Collection Lifecycle**
Register → login → create a PUBLIC collection → list it anonymously → fetch it → update it → verify the update → delete it.

**02 Private Invitation Acceptance**
Register owner and invitee → both log in → owner creates a PRIVATE collection → invites the invitee as COLLABORATOR → invitee lists and accepts the invitation → invitee accesses the collection → verify they appear in the member list → cleanup.

**03 Role Downgrade And Removal**
Same setup as scenario 02, but after acceptance the owner downgrades the member to READER, verifies the change, then removes them entirely. A final request confirms the removed member gets a 403 on the private collection.

Each flow stores intermediate values (tokens, IDs) in collection variables via `sandbox/evaluate` blocks, so steps further down the chain automatically pick them up.

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
- [ ] CI/CD
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
