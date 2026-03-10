# Postman testing guide

This file lists what to add in Postman so you can manually test every custom API endpoint exposed by the backend.

## Base setup

Create a Postman environment with these variables:

| Variable | Example value | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3000` | API base URL |
| `ownerEmail` | `owner@example.com` | First user for authenticated and owner-only flows |
| `ownerPassword` | `StrongPass123!` | Password for the owner user |
| `inviteeEmail` | `invitee@example.com` | Second user for invitation workflows |
| `inviteePassword` | `StrongPass123!` | Password for the invited user |
| `ownerToken` | *(set after login)* | Bearer token for the owner |
| `inviteeToken` | *(set after login)* | Bearer token for the invited user |
| `ownerUserId` | *(set after register/login)* | Owner user id |
| `inviteeUserId` | *(set after register/login)* | Invitee user id |
| `publicUserId` | *(copy from one of the users above)* | Used for public user routes |
| `collectionId` | *(set after creating a collection)* | Main collection id |
| `mediaId` | *(set after creating media)* | Media id |
| `collectionMediaId` | *(set after add media to collection)* | Collection-media join id |
| `memberId` | *(set after invite member)* | Collection member/invitation id |
| `resetToken` | *(from your reset mail/provider)* | Only needed for `/reset-password` |

Use this header on authenticated requests:

- `Authorization: Bearer {{ownerToken}}`
- or `Authorization: Bearer {{inviteeToken}}`

Also keep `Content-Type: application/json` for every request with a JSON body.

## Useful Postman test scripts

### Save owner login data

Add this in the **Tests** tab of the owner register or login request:

```javascript
const json = pm.response.json();
if (json.user?.id) pm.environment.set('ownerUserId', json.user.id);
if (json.sessionToken) pm.environment.set('ownerToken', json.sessionToken);
```

### Save invitee login data

```javascript
const json = pm.response.json();
if (json.user?.id) pm.environment.set('inviteeUserId', json.user.id);
if (json.sessionToken) pm.environment.set('inviteeToken', json.sessionToken);
```

### Save collection identifiers

Use this after collection/media/member creation requests:

```javascript
const json = pm.response.json();
if (json.id) {
  if (pm.info.requestName.includes('Create Collection')) pm.environment.set('collectionId', json.id);
  if (pm.info.requestName.includes('Create Media')) pm.environment.set('mediaId', json.id);
  if (pm.info.requestName.includes('Add Media To Collection')) pm.environment.set('collectionMediaId', json.id);
  if (pm.info.requestName.includes('Invite Member')) pm.environment.set('memberId', json.id);
}
```

## Recommended execution order

1. Check health endpoints.
2. Register owner.
3. Login owner and save `ownerToken`.
4. Register invitee.
5. Login invitee and save `inviteeToken`.
6. Create one collection as owner.
7. Create one media item as owner.
8. Add media to the collection.
9. Invite the second user.
10. Login as invitee and accept the invitation.
11. Test member and invitation endpoints.
12. Finish with update/delete endpoints.

## System endpoints

### Root info

- **GET** `{{baseUrl}}/`
- **Auth:** none
- **Expected:** `200 OK`

### API root info

- **GET** `{{baseUrl}}/api`
- **Auth:** none
- **Expected:** `200 OK`

### Health check

- **GET** `{{baseUrl}}/health`
- **Auth:** none
- **Expected:** `200 OK`

### OpenAPI document

- **GET** `{{baseUrl}}/openapi`
- **Auth:** none
- **Expected:** `200 OK`

### Swagger UI

- **GET** `{{baseUrl}}/docs`
- **Auth:** none
- **Expected:** `200 OK`

## Auth endpoints

### Register owner

- **POST** `{{baseUrl}}/api/auth/register`
- **Auth:** none
- **Body:**

```json
{
  "email": "{{ownerEmail}}",
  "password": "{{ownerPassword}}",
  "name": "Owner User"
}
```

### Register invitee

- **POST** `{{baseUrl}}/api/auth/register`
- **Auth:** none
- **Body:**

```json
{
  "email": "{{inviteeEmail}}",
  "password": "{{inviteePassword}}",
  "name": "Invitee User"
}
```

### Login owner

- **POST** `{{baseUrl}}/api/auth/login`
- **Auth:** none
- **Body:**

```json
{
  "email": "{{ownerEmail}}",
  "password": "{{ownerPassword}}"
}
```

- **Save:** `ownerToken`, `ownerUserId`

### Login invitee

- **POST** `{{baseUrl}}/api/auth/login`
- **Auth:** none
- **Body:**

```json
{
  "email": "{{inviteeEmail}}",
  "password": "{{inviteePassword}}"
}
```

- **Save:** `inviteeToken`, `inviteeUserId`

### Authenticated session info

- **GET** `{{baseUrl}}/api/auth/me`
- **Auth:** `Bearer {{ownerToken}}`
- **Expected:** current user and session details

### Forgot password

- **POST** `{{baseUrl}}/api/auth/forgot-password`
- **Auth:** none
- **Body:**

```json
{
  "email": "{{ownerEmail}}"
}
```

### Reset password

- **POST** `{{baseUrl}}/api/auth/reset-password`
- **Auth:** none
- **Body:**

```json
{
  "token": "{{resetToken}}",
  "newPassword": "NewStrongPass123!"
}
```

### Logout

- **POST** `{{baseUrl}}/api/auth/logout`
- **Auth:** `Bearer {{ownerToken}}`
- **Expected:** `200 OK`

## User endpoints

### Get my profile

- **GET** `{{baseUrl}}/api/users/me`
- **Auth:** `Bearer {{ownerToken}}`

### Update my profile

- **PATCH** `{{baseUrl}}/api/users/me`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "name": "Owner User Updated",
  "displayUsername": "Owner Updated",
  "image": "https://example.com/avatar.png"
}
```

### Get a public user profile

- **GET** `{{baseUrl}}/api/users/{{publicUserId}}`
- **Auth:** none

### Get a user's public collections

- **GET** `{{baseUrl}}/api/users/{{publicUserId}}/collections`
- **Auth:** none

## Media endpoints

### Create media

- **POST** `{{baseUrl}}/api/media`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "collectionId": "{{collectionId}}",
  "title": "Inception",
  "description": "Dreams within dreams",
  "type": "FILM",
  "tags": ["sci-fi", "mind-bending"],
  "platforms": ["Netflix"],
  "url": "https://example.com/inception",
  "releaseDate": "2010-07-16T00:00:00.000Z",
  "directorAuthor": "Christopher Nolan"
}
```

- **Save:** `mediaId`

### List media

- **GET** `{{baseUrl}}/api/media?page=1&pageSize=20&q=inception&type=FILM&tags=sci-fi,mind-bending&platforms=Netflix`
- **Auth:** none

### Get media by id

- **GET** `{{baseUrl}}/api/media/{{mediaId}}`
- **Auth:** none

### Update media

- **PATCH** `{{baseUrl}}/api/media/{{mediaId}}`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "title": "Inception (Updated)",
  "tags": ["sci-fi", "classic"]
}
```

### Delete media

- **DELETE** `{{baseUrl}}/api/media/{{mediaId}}`
- **Auth:** `Bearer {{ownerToken}}`

## Collection endpoints

### Create collection

- **POST** `{{baseUrl}}/api/collections`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "name": "Favorites",
  "description": "Shared favorites",
  "tags": ["favorites", "movies"],
  "visibility": "PUBLIC"
}
```

- **Save:** `collectionId`

### List collections

- **GET** `{{baseUrl}}/api/collections?page=1&pageSize=20&tag=favorites&q=fav&sort=createdAt&order=desc`
- **Auth:** optional

### Get collection by id

- **GET** `{{baseUrl}}/api/collections/{{collectionId}}`
- **Auth:** optional (required in practice for private collections)

### Update collection

- **PATCH** `{{baseUrl}}/api/collections/{{collectionId}}`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "description": "Updated description",
  "tags": ["favorites", "updated"]
}
```

### Delete collection

- **DELETE** `{{baseUrl}}/api/collections/{{collectionId}}`
- **Auth:** `Bearer {{ownerToken}}`

## Collection media endpoints

### Add media to collection

- **POST** `{{baseUrl}}/api/collections/{{collectionId}}/media`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "mediaId": "{{mediaId}}",
  "position": 1
}
```

- **Save:** `collectionMediaId`

### List collection media

- **GET** `{{baseUrl}}/api/collections/{{collectionId}}/media`
- **Auth:** optional (depends on collection visibility/access)

### Update collection media

- **PATCH** `{{baseUrl}}/api/collections/{{collectionId}}/media/{{collectionMediaId}}`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "position": 2
}
```

### Remove media from collection

- **DELETE** `{{baseUrl}}/api/collections/{{collectionId}}/media/{{collectionMediaId}}`
- **Auth:** `Bearer {{ownerToken}}`

## Collection member and invitation endpoints

### Invite a member

- **POST** `{{baseUrl}}/api/collections/{{collectionId}}/members`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "userId": "{{inviteeUserId}}",
  "role": "COLLABORATOR"
}
```

- **Save:** `memberId`

### List collection members

- **GET** `{{baseUrl}}/api/collections/{{collectionId}}/members`
- **Auth:** optional for public collections, otherwise authenticated access is needed

### Update a member role

- **PATCH** `{{baseUrl}}/api/collections/{{collectionId}}/members/{{memberId}}`
- **Auth:** `Bearer {{ownerToken}}`
- **Body:**

```json
{
  "role": "READER",
  "accepted": true
}
```

### Remove a member

- **DELETE** `{{baseUrl}}/api/collections/{{collectionId}}/members/{{memberId}}`
- **Auth:** `Bearer {{ownerToken}}`

### List pending invitations for the invitee

- **GET** `{{baseUrl}}/api/collections/invitations`
- **Auth:** `Bearer {{inviteeToken}}`

### Accept an invitation

- **POST** `{{baseUrl}}/api/collections/{{collectionId}}/invitations/respond`
- **Auth:** `Bearer {{inviteeToken}}`
- **Body:**

```json
{
  "accept": true
}
```

### Reject an invitation

- **POST** `{{baseUrl}}/api/collections/{{collectionId}}/invitations/respond`
- **Auth:** `Bearer {{inviteeToken}}`
- **Body:**

```json
{
  "accept": false
}
```

## Notes and gotchas

- The login endpoint returns the bearer token in both `sessionToken` and the `set-auth-token` response header.
- When both cookie auth and bearer auth are present, the server prefers the bearer token.
- For private collections, list/get member/media endpoints require the right authenticated user.
- `POST /api/collections/:id/members` creates a pending invitation; the invited user does **not** get access until they accept it.
- There is a catch-all Better Auth handler mounted at `/api/auth/*` for provider-specific flows. Those built-in endpoints depend on your auth provider configuration and are not listed here because their behavior is managed by Better Auth.
