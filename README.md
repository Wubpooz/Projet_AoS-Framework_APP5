# Projet APP5 — Architecture Orientée Services
> A REST API backend for managing cross-platform media watch lists. Users can create collections of movies, shows, books, or articles, share them with others, and manage who can view or edit them.


## What's been built
- **Authentication** — register, login, logout, forgot/reset password via [Better Auth](https://github.com/better-auth/better-auth). Session tokens are returned in the `set-auth-token` response header.
- **Users** — profile read/update, public user lookup.
- **Media** — full CRUD with access control. Only the creator can modify or delete their entries.
- **Collections** — create/list/get/update/delete, with public or private visibility. Supports pagination, tag filtering, and title search.
- **Roles & invitations** — collection owners can invite users as `COLLABORATOR` or `READER`. Invitees accept or decline via a dedicated endpoint. Owners can change roles or remove members at any time.
- **MCP server** — stateless HTTP `/mcp` transport plus a stdio entrypoint that reuses the existing collection, media, and user services with per-call bearer-token auth.
- **OpenAPI spec** — auto-generated and served at `/openapi` (JSON) and `/docs` (Scalar UI).
- **Docker Compose** — baseline for local containerized execution.
- **Rate limiting** — basic rate limiter on all routes.

There is no front-end, see the progress tracking section at the bottom.


&nbsp;  

## Stack (Choix techniques)
| Layer      | Tool                                                      |
|------------|-----------------------------------------------------------|
| Runtime    | [Bun](https://bun.sh)                                     |
| Framework  | [Hono](https://hono.dev)                                  |
| Validation | [Zod](https://zod.dev)                                    |
| ORM        | [Prisma](https://www.prisma.io)                           |
| Database   | PostgreSQL 16                                             |
| Auth       | [Better Auth](https://github.com/better-auth/better-auth) |

---

&nbsp;  
## Getting Started
**Prerequisites:** Bun and Docker (for Postgres).

1) Clone the repo and install dependencies:
    ```bash
    git clone <repo-url>
    bun install
    ```
2) Start Postgres:
    ```bash
    docker run --name aos-postgres \
      -e POSTGRES_USER=johndoe \
      -e POSTGRES_PASSWORD=randompassword \
      -e POSTGRES_DB=mydb \
      -p 5432:5432 -d postgres:16
    ```
    If it already exists:
    ```bash
    docker start aos-postgres
    ```
3) Set up environment:
    ```bash
    cp backend/.env.example backend/.env
    ```
    Edit `backend/.env` — at minimum update `DATABASE_URL`. MCP is enabled by default outside production; set `MCP_ENABLED=true` explicitly in prod when you are ready.
4) Set up the database:
    ```bash
    bun run prisma:generate
    bun run prisma:migrate
    bun run prisma:seed
    ```
5) Start the dev server:
    ```bash
    bun run dev
    ```

&nbsp;  

The server runs on `http://localhost:3000` by default. If Postgres isn't reachable, startup logs `dbConnection: "error"` but the process still starts.  
When this setup is done, you can use `bun run dev:stack` to start both the API and Postgres together via Docker Compose (see below).  

> **Note:** Bun looks for `.env` in the current working directory. If you run commands from the repo root, either copy `backend/.env` to `.env` at the root, or export `DATABASE_URL` in your shell beforehand.




## Run with Docker Compose
This repository includes a local Docker setup (`compose.yaml`) with:
- `api` (development target, hot reload)
- `db` (PostgreSQL 16)
- `api-prod` (optional production-like target via profile)


### Start local stack (dev)
```bash
docker compose up --build
```
The API will be available at `http://localhost:3000` and Postgres at `localhost:5432`.

### Stop stack
```bash
docker compose down
```

To also remove the Postgres volume:
```bash
docker compose down -v
```

### Run production-like API target (optional)
```bash
docker compose --profile prod up --build api-prod db
```

> `api-prod` uses the `prod` target from `Dockerfile` and runs without hot reload.

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

## Endpoints
### API Documentation
Once the server is running:
- **Scalar UI:** `http://localhost:3000/docs`
- **Raw OpenAPI JSON:** `http://localhost:3000/openapi`
- **Static copy:** `docs/openapi.yml`

MCP uses its own protocol surface rather than OpenAPI.

### Endpoint list
**Access control:** owner, collaborator, reader roles on collections.

#### System / OpenAPI
- `GET /health` : health check
- `GET /openapi` : OpenAPI spec (JSON/YAML)
- `GET /docs` : Swagger UI / API docs

&nbsp;  
#### Auth
- `POST /api/auth/register` : register a new user
- `POST /api/auth/login` : log in and receive a session token
- `POST /api/auth/logout` : revoke current session
- `POST /api/auth/forgot-password` : request a password reset email
- `POST /api/auth/reset-password` : complete password reset with token
- `GET /api/auth/me` : get current authenticated user + session info

&nbsp;  
#### Users
- `GET /api/users/me` : get authenticated user's profile and settings
- `PATCH /api/users/me` : update authenticated user's profile
- `GET /api/users/{userId}` : get public profile by user ID
- `GET /api/users/{userId}/collections` : list public collections for a user

&nbsp;  
#### Media
- `POST /api/media` : create a new media item
- `GET /api/media` : list media items (pagination, filtering, sorting)
- `GET /api/media/{mediaId}` : get a media item by ID
- `PATCH /api/media/{mediaId}` : update media item
- `DELETE /api/media/{mediaId}` : delete media item (admin/owner)

&nbsp;  
#### Collections
- `POST /api/collections` : create a new collection
- `GET /api/collections` : list collections (public or owned/member)
- `GET /api/collections/{collectionId}` : get collection details (includes media count)
- `PATCH /api/collections/{collectionId}` : update collection (owner only)
- `DELETE /api/collections/{collectionId}` : delete collection (owner only)

##### Collection Media
- `POST /api/collections/{collectionId}/media` : add media to collection (owner/collaborator)
  - Example body: `{ "mediaId": "...", "position": 3 }`
- `GET /api/collections/{collectionId}/media` : list media in collection
- `PATCH /api/collections/{collectionId}/media/{collectionMediaId}` : update collection media (position, etc.)
- `DELETE /api/collections/{collectionId}/media/{collectionMediaId}` : remove media from collection


##### Collection Members & Invitations
- `POST /api/collections/{collectionId}/members` : invite a user to the collection (owner only)
- `GET /api/collections/{collectionId}/members` : list collection members
- `PATCH /api/collections/{collectionId}/members/{memberId}` : update member role (owner only)
- `DELETE /api/collections/{collectionId}/members/{memberId}` : remove member from collection (owner only)

- `GET /api/collections/invitations` : list pending invitations for the authenticated user
- `POST /api/collections/{collectionId}/invitations/respond` : accept or reject an invitation (invited user only)

> Invitations must be explicitly accepted by the invited user before they gain access.

The `CollectionUser` model in Prisma includes:
- `invitedAt`: Timestamp when invitation was created (defaults to `now()`)
- `accepted`: Boolean flag (defaults to `false`)
- `role`: The role assigned to the member (OWNER, COLLABORATOR, READER)

&nbsp;  
#### Future / Planned (P2)
**Scores and Notes** (not implemented)
- `POST /media/{mediaId}/scores`
- `GET /media/{mediaId}/scores`
- `PATCH /media/{mediaId}/scores/{scoreId}`
- `DELETE /media/{mediaId}/scores/{scoreId}`

**Tags** (optional helper)
- `GET /tags` : list most used tags across media/collections



---

## MCP
The backend exposes a Model Context Protocol server that reuses the same service-layer business logic as the REST routes.

### Transports
- HTTP / Streamable HTTP: `http://localhost:3000/mcp`
- stdio: `bun run mcp:stdio`

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


---

## Postman
The `postman/` folder contains everything needed to test the API manually.

### Collections
Import the collection from `postman/collections/New Collection/` into Postman (File → Import, select the folder). The collection is organized into folders:

| Folder      | What it covers                            |
|-------------|-------------------------------------------|
| Auth        | Register, login, logout, password reset   |
| Users       | Profile read/update, public lookup        |
| Media       | CRUD for media items                      |
| Collections | CRUD, media linking, members, invitations |
| System      | Health check, OpenAPI                     |

### Environment
The environment already includes these variables:
- `baseUrl`
- `ownerEmail`, `ownerPassword`
- `inviteeEmail`, `inviteePassword`
- `ownerToken`, `inviteeToken`
- `ownerUserId`, `inviteeUserId`
- `collectionId`, `memberId`

Import `postman/environments/Media Collection API.yaml`. It pre-fills `baseUrl`, test user credentials, and empty slots for `ownerToken`, `inviteeToken`, `collectionId`, etc. that get populated by request scripts as you run through the collection.


### Scenario testing
The easiest and most maintainable way to run end-to-end scenarios is to reuse the existing Postman requests in sequence.

&nbsp;  
#### Before running a scenario
1. Start the backend (`bun run dev:stack`).
2. Select the `Media Collection API` environment in Postman.
3. If needed, clear stale collection variables from previous runs:
   - `ownerToken`
   - `inviteeToken`
   - `ownerUserId`
   - `inviteeUserId`
   - `collectionId`
   - `memberId`

If a registration request fails because a user already exists, either change the emails in the environment, or delete/reset the test users in your local database.



#### Scenario 01 — Public collection lifecycle
1. `Auth/01 Register Owner`
2. `Auth/03 Login Owner`
3. `Collections/01 Create Collection`
4. `Collections/02 List Collections`
5. `Collections/03 Get Collection By Id`
6. `Collections/04 Update Collection`
7. `Collections/03 Get Collection By Id`
8. `Collections/16 Delete Collection`

#### Scenario 02 — Private invitation acceptance
1. `Auth/01 Register Owner`
2. `Auth/02 Register Invitee`
3. `Auth/03 Login Owner`
4. `Auth/04 Login Invitee`
5. `Collections/01 Create Collection`
6. `Collections/09 Invite Member To Collection`
7. `Collections/11 List Pending Invitations (Invitee)`
8. `Collections/12 Accept Invitation (Invitee)`
9. `Collections/17 Get Collection By Id As Invitee`
10. `Collections/10 List Collection Members`
11. `Collections/16 Delete Collection`

#### Scenario 03 — Role downgrade and removal
1. `Auth/01 Register Owner`
2. `Auth/02 Register Invitee`
3. `Auth/03 Login Owner`
4. `Auth/04 Login Invitee`
5. `Collections/01 Create Collection`
6. `Collections/09 Invite Member To Collection`
7. `Collections/12 Accept Invitation (Invitee)`
8. `Collections/13 Update Member Role`
9. `Collections/10 List Collection Members`
10. `Collections/14 Remove Member From Collection`
11. `Collections/10 List Collection Members`
12. `Collections/18 Get Collection By Id As Removed Invitee`
13. `Collections/16 Delete Collection`



### Flows (optional)
We've started creating Postman Flows under `postman/flows/` as a visual and experimental way to represent the scenarios. However, only the first one is in a "ok" state, it doesn't work yet but looks like the correct request flow.



---

## Updating the Schema
```bash
# After editing backend/prisma/schema.prisma:
bun run prisma:generate   # regenerate the client
bun run prisma:migrate    # apply changes to the DB
bun run prisma:seed       # optional: re-seed
```

---

## DataModel (Décisions d'architecture)
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
- [x] Docker setup
- [x] Postman collection + flows

### P2
- [ ] Fine-grained access control
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

## 🚧 Difficultés rencontrées

* **Intégration et configuration de Better Auth avec Hono :**
    * *Problème :* Bien que puissant, mettre en place Better Auth au sein de l'écosystème Hono et s'assurer de la bonne gestion des sessions (via les headers `set-auth-token` et l'authentification `Bearer`) a nécessité une lecture approfondie de la documentation et plusieurs itérations de débogage.
    * *Solution :* Nous avons structuré notre middleware d'authentification pour gérer de manière unifiée les requêtes de l'API REST et du serveur MCP.

* **Développement du serveur MCP (Model Context Protocol) :**
    * *Problème :* Implémenter le serveur MCP en parallèle de l'API REST, tout en réutilisant la logique métier (services) et en gérant correctement l'authentification par token pour les *tools* protégés, a été complexe. Les tests via `stdio` ont également posé quelques soucis de configuration initiale.
    * *Solution :* Séparation claire de la logique métier (couche Service) des couches de transport (REST et MCP) et création de scripts de tests spécifiques (`bun run mcp:test`).

* **Mise en place des tests d'intégration avec Postman :**
    * *Problème :* Organiser les scénarios complexes impliquant plusieurs utilisateurs (comme le cycle de vie des invitations privées) tout en gérant correctement les variables d'environnement (tokens, IDs) dynamiquement entre les requêtes.
    * *Solution :* Utilisation intensive des scripts de pré-requête et de post-réponse dans Postman pour automatiser la mise à jour des variables (`ownerToken`, `inviteeToken`, etc.) afin de pouvoir enchaîner les requêtes de manière fluide.
