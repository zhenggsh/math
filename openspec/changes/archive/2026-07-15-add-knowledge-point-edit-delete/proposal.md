## Why

The knowledge point overview currently supports adding child knowledge points, but lacks the rest of the CRUD lifecycle. Teachers and admins need to correct or update knowledge point metadata (definition, characteristics, importance level) and remove obsolete knowledge points. Without in-place edit and delete, they must manually edit the database or markdown files, which is error-prone and breaks the unified learning UI workflow.

## What Changes

- Add an **Edit** button in the knowledge point overview area. Clicking it opens a modal pre-filled with the current knowledge point's code, name, definition, characteristics, and importance level. Submitting persists changes **only to the database**; the underlying markdown content file is not rewritten. Changing the code recomputes the hierarchy level fields and rejects duplicates.
- Add a **Delete** button in the knowledge point overview area. Clicking it triggers a confirmation, then removes the knowledge point row from the database and deletes its corresponding content block from the textbook markdown file to keep the file and DB in sync.
- Mark the existing **Add Child Knowledge Point** feature as completed in the implementation plan.

## Capabilities

### New Capabilities

- `knowledge-point-edit`: Modify a knowledge point's overview metadata (code, name, definition, characteristics, importance level) stored in the database.
- `knowledge-point-delete`: Remove a knowledge point from the database and delete its corresponding content block from the textbook markdown file.

### Modified Capabilities

- None. Existing capabilities such as knowledge-point navigation and smart-learning recommendations are only impacted by implementation details (e.g., tree refetch after delete), not by spec-level requirement changes.

## Impact

- **Frontend**: `LearningPage`, `SmartLearningPage`, knowledge overview panel, new `EditKnowledgePointModal` and `DeleteKnowledgePointButton` components, and `knowledgeApi` service methods.
- **Backend**: `KnowledgePointController` and `KnowledgePointService` for `PATCH` and `DELETE` endpoints; `TextbookService` for markdown content-block removal.
- **Database**: Updates and deletes against the `KnowledgePoint` table, with hierarchy-aware validation.
- **File system**: In-place rewrite of the textbook `.md` file when a knowledge point is deleted.
- **Auth**: Edit and delete actions are restricted to teachers and admins, consistent with the existing add-child-knowledge-point feature.
