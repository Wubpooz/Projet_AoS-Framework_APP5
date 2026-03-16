# API Endpoints

**Access control:** owner, collaborator, reader roles on collections.

---

## System / OpenAPI

- `GET /health` : health check
- `GET /openapi` : OpenAPI spec (JSON/YAML)
- `GET /docs` : Swagger UI / API docs

---

## Auth

- `POST /api/auth/register` : register a new user
- `POST /api/auth/login` : log in and receive a session token
- `POST /api/auth/logout` : revoke current session
- `POST /api/auth/forgot-password` : request a password reset email
- `POST /api/auth/reset-password` : complete password reset with token
- `GET /api/auth/me` : get current authenticated user + session info

---

## Users

- `GET /api/users/me` : get authenticated user's profile and settings
- `PATCH /api/users/me` : update authenticated user's profile
- `GET /api/users/{userId}` : get public profile by user ID
- `GET /api/users/{userId}/collections` : list public collections for a user

---

## Media

- `POST /api/media` : create a new media item
- `GET /api/media` : list media items (pagination, filtering, sorting)
- `GET /api/media/{mediaId}` : get a media item by ID
- `PATCH /api/media/{mediaId}` : update media item
- `DELETE /api/media/{mediaId}` : delete media item (admin/owner)

---

## Collections

- `POST /api/collections` : create a new collection
- `GET /api/collections` : list collections (public or owned/member)
- `GET /api/collections/{collectionId}` : get collection details (includes media count)
- `PATCH /api/collections/{collectionId}` : update collection (owner only)
- `DELETE /api/collections/{collectionId}` : delete collection (owner only)

### Collection Media

- `POST /api/collections/{collectionId}/media` : add media to collection (owner/collaborator)
  - Example body: `{ "mediaId": "...", "position": 3 }`
- `GET /api/collections/{collectionId}/media` : list media in collection
- `PATCH /api/collections/{collectionId}/media/{collectionMediaId}` : update collection media (position, etc.)
- `DELETE /api/collections/{collectionId}/media/{collectionMediaId}` : remove media from collection

### Collection Members & Invitations

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

---

## Future / Planned (P2)

**Scores and Notes** (not implemented)
- `POST /media/{mediaId}/scores`
- `GET /media/{mediaId}/scores`
- `PATCH /media/{mediaId}/scores/{scoreId}`
- `DELETE /media/{mediaId}/scores/{scoreId}`

**Tags** (optional helper)
- `GET /tags` : list most used tags across media/collections
