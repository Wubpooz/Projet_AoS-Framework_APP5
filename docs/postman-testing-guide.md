# Postman testing guide

> We've implemented all the API endpoints in folders for easy manual testing, and we've added Postman pre-request and post-response scripts to handle variable management and assertions. This guide explains how to use the Postman collection effectively for testing the Media Collection API. 

&nbsp;  
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


&nbsp;  
## Before running a scenario
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


&nbsp;  

## Scenario 01 — Public collection lifecycle
1. `Auth/01 Register Owner`
2. `Auth/03 Login Owner`
3. `Collections/01 Create Collection`
4. `Collections/02 List Collections`
5. `Collections/03 Get Collection By Id`
6. `Collections/04 Update Collection`
7. `Collections/03 Get Collection By Id`
8. `Collections/16 Delete Collection`

&nbsp;  

## Scenario 02 — Private invitation acceptance
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


&nbsp;  

## Scenario 03 — Role downgrade and removal
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


&nbsp;  

## Postman Flows
We've started creating Postman Flows under `postman/flows/` as a visual and experimental way to represent the scenarios. However, only the first one is in a "ok" state, it doesn't work yet but looks like the correct request flow.
