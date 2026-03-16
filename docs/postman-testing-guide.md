# Postman testing guide

This project already has a solid set of reusable Postman requests under `postman/collections/New Collection/`.

The simplest and most standard way to test end-to-end scenarios is to:

1. import the collection folder,
2. import the environment,
3. run the existing requests in a documented order,
4. let the request scripts carry tokens and IDs forward through collection variables.

This avoids the extra maintenance cost of Postman Flows while still reusing the work already done in the collection.

---

## What to import

- Collection folder: `postman/collections/New Collection/`
- Environment: `postman/environments/Media Collection API.yaml`

The environment already includes these variables:

- `baseUrl`
- `ownerEmail`, `ownerPassword`
- `inviteeEmail`, `inviteePassword`
- `ownerToken`, `inviteeToken`
- `ownerUserId`, `inviteeUserId`
- `collectionId`, `memberId`

Most of these are populated automatically by request scripts as you run the scenarios.

---

## Why this approach is recommended

Compared with Postman Flows, ordered request scenarios are:

- easier to debug,
- easier to version in Git,
- easier to keep in sync with endpoint changes,
- more familiar to teammates using Postman Collection Runner,
- directly reusable in Newman or the Postman CLI later.

The current request files already do the important state handoff work:

- auth requests save `ownerToken`, `inviteeToken`, `ownerUserId`, and `inviteeUserId`
- collection creation saves `collectionId`
- invitation creation saves `memberId`
- cleanup removes temporary collection variables

That means the scenarios below mostly become “run these requests in this order”.

---

## Before running a scenario

1. Start the backend.
2. Select the `Media Collection API` environment in Postman.
3. If needed, clear stale collection variables from previous runs:
   - `ownerToken`
   - `inviteeToken`
   - `ownerUserId`
   - `inviteeUserId`
   - `collectionId`
   - `memberId`

If a registration request fails because a user already exists, either:

- change the emails in the environment, or
- delete/reset the test users in your local database.

---

## Scenario 01 — Public collection lifecycle

This replaces the Flow `01 Public Collection Lifecycle` with a standard ordered request run.

### Request order

1. `Auth/01 Register Owner`
2. `Auth/03 Login Owner`
3. `Collections/01 Create Collection`
4. `Collections/02 List Collections`
5. `Collections/03 Get Collection By Id`
6. `Collections/04 Update Collection`
7. `Collections/03 Get Collection By Id`
8. `Collections/16 Delete Collection`

### Recommended body tweaks

Before step 3, set the create body to use a public collection if needed:

```json
{
  "name": "Public Scenario Collection",
  "description": "Scenario 01 public lifecycle",
  "tags": ["public", "scenario"],
  "visibility": "PUBLIC"
}
```

Before step 6, use an update body such as:

```json
{
  "name": "Updated Public Scenario Collection",
  "description": "Updated during scenario 01",
  "visibility": "PUBLIC"
}
```

### What gets reused automatically

- `01 Register Owner` stores `ownerUserId`
- `03 Login Owner` stores `ownerToken`
- `01 Create Collection` stores `collectionId`
- `16 Delete Collection` clears `collectionId`, `collectionMediaId`, and `memberId`

---

## Scenario 02 — Private invitation acceptance

This replaces the Flow `02 Private Invitation Acceptance` with a standard request sequence.

### Request order

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

### Recommended body tweaks

Before step 5:

```json
{
  "name": "Private Watch List",
  "description": "Scenario 02 private invitation acceptance",
  "tags": ["private", "scenario"],
  "visibility": "PRIVATE"
}
```

Step 6 already invites `{{inviteeUserId}}` as `COLLABORATOR` and stores `memberId`.

### Expected results

- step 6 returns `201`
- step 7 shows the pending invitation for the invitee
- step 8 confirms the invitation was accepted
- step 9 returns `200` for the invitee on the private collection
- step 10 includes the invitee in the member list

---

## Scenario 03 — Role downgrade and removal

This replaces the Flow `03 Role Downgrade And Removal` with a standard request sequence.

### Request order

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

### Recommended body tweaks

Before step 5:

```json
{
  "name": "Role Test Collection",
  "description": "Scenario 03 role downgrade and removal",
  "tags": ["role", "scenario"],
  "visibility": "PRIVATE"
}
```

Step 8 already downgrades the role to `READER` using `{{memberId}}`.

### Access-check helper requests

Two tiny helper requests were added to keep the scenarios standard and repeatable without Postman Flows:

- `Collections/17 Get Collection By Id As Invitee`
- `Collections/18 Get Collection By Id As Removed Invitee`

They reuse the same endpoint as `Collections/03 Get Collection By Id`, but authenticate with `{{inviteeToken}}` so the invitation and removal scenarios can assert the correct access behavior directly.

---

## Manual run vs Collection Runner

### Best zero-duplication option

Run the scenario manually in the order shown above.

This is the easiest option and reuses the exact request files you already have.

### Best one-click Postman option

Use the ready-made scenario folders under:

- `postman/collections/New Collection/Scenarios/01 Public Collection Lifecycle/`
- `postman/collections/New Collection/Scenarios/02 Private Invitation Acceptance/`
- `postman/collections/New Collection/Scenarios/03 Role Downgrade And Removal/`

Each folder contains runner-friendly request copies in execution order, with explicit auth and scenario-specific assertions.

### Best CI-friendly option

For automated regression coverage in Git, prefer Bun route tests under `backend/src/routes/*.test.ts`.

Use Postman for:

- manual QA,
- demos,
- exploratory endpoint testing,
- quick end-to-end checks with real request payloads.

---

## Recommendation

For this repository, the most practical setup is:

1. keep the existing request collection as the source of truth,
2. use this guide for scenario execution,
3. treat the current `postman/flows/` files as optional experiments or visual references,
4. move important regression checks into Bun tests over time.

That gives you the lowest-maintenance path while preserving the work already invested in the Postman requests and scripts.