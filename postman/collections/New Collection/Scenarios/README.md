# Scenario folders

This directory contains three runner-friendly scenario folders, each of which can be executed with a single click using Postman's Collection Runner.

## Setup

1. Import the parent collection (`postman/collections/New Collection/`) into Postman if you haven't already.
2. Import the environment `postman/environments/Media Collection API.yaml` and select it.
3. Before running any scenario, clear the following collection variables using the **Environment Quick Look** (eye icon):
   - `ownerToken`
   - `inviteeToken`
   - `ownerUserId`
   - `inviteeUserId`
   - `collectionId`
   - `memberId`

## Running a scenario

1. Open the desired scenario folder:
   - `01 Public Collection Lifecycle`
   - `02 Private Invitation Acceptance`
   - `03 Role Downgrade And Removal`
2. Launch the Collection Runner (Runner button or *File → Run Collection*).
3. Ensure the correct environment is selected, then click **Start Run**.

Each folder contains the same requests used elsewhere in the collection, but ordered and parameterized for the scenario. The scripts inside will automatically save and consume tokens/IDs, so you can treat the folder as an end-to-end workflow.

These folders are a convenience layer; the canonical request definitions live higher in the collection and are used by the testing guide and by the Bun route tests.