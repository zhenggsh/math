## 1. Mark existing add-child-knowledge-point work as completed

- [x] 1.1 Backend `POST /textbooks/:textbookId/knowledge-points` endpoint for creating child knowledge points
- [x] 1.2 Backend `KnowledgePointService.create` validation (parent exists, hierarchy depth, code uniqueness, code prefix)
- [x] 1.3 Backend `TextbookService.appendChildKnowledgePointBlock` to append placeholder content to MD file
- [x] 1.4 Frontend `AddChildKnowledgePointModal` component with auto-derived code
- [x] 1.5 Frontend `AddChildKnowledgePointButton` component with role and level-aware disabled state
- [x] 1.6 Integrate add button and modal into `LearningPage` and `SmartLearningPage`
- [x] 1.7 Frontend and backend tests for the add feature

## 2. Backend knowledge point edit

- [x] 2.1 Add `UpdateKnowledgePointDto` with class-validator decorators for `code`, `name`, `definition`, `characteristics`, and `importanceLevel`
- [x] 2.2 Add `PATCH /textbooks/:textbookId/knowledge-points/:id` endpoint in `KnowledgePointController` with `JwtAuthGuard` and `RolesGuard` for TEACHER/ADMIN, returning `name` in the response
- [x] 2.3 Add `KnowledgePointService.update` method that validates existence, textbook ownership, code uniqueness when code changes, recomputes `level1`/`level2`/`level3`, and updates DB fields
- [x] 2.4 Add unit tests for `KnowledgePointService.update` and `KnowledgePointController.update` including code change and conflict scenarios
- [x] 2.5 Add `name` column to `KnowledgePoint` Prisma model and apply migration
- [x] 2.6 Return `name` from `TextbookService.getKnowledgePoints` and `getKnowledgePointDetail`, and update `TextbookController` response types

## 3. Backend knowledge point delete

- [x] 3.1 Add `DELETE /textbooks/:textbookId/knowledge-points/:id` endpoint in `KnowledgePointController` with `JwtAuthGuard` and `RolesGuard` for TEACHER/ADMIN
- [x] 3.2 Add `KnowledgePointService.delete` method that rejects deletion of non-leaf nodes, deletes the DB row, and calls the MD helper
- [x] 3.3 Add `TextbookService.removeKnowledgePointBlock` method that locates the content block via `findContentBlockRange` and rewrites the MD file without the block
- [x] 3.4 Add unit tests for `KnowledgePointService.delete` and `KnowledgePointController.delete`
- [x] 3.5 Add tests for `TextbookService.removeKnowledgePointBlock` covering normal removal and missing-block edge case

## 4. Frontend knowledge point edit UI

- [x] 4.1 Create `EditKnowledgePointModal` component with Ant Design Form pre-filled with `code`, `name`, `definition`, `characteristics`, and `importanceLevel`
- [x] 4.2 Add `knowledgeApi.updateKnowledgePoint(textbookId, id, dto)` service method
- [x] 4.3 Add `EditKnowledgePointButton` component that is disabled for non-edit users
- [x] 4.4 Add tests for `EditKnowledgePointModal` and `EditKnowledgePointButton`
- [x] 4.5 Pass current `code` and `name` from `LearningPage` and `SmartLearningPage` into `EditKnowledgePointModal` and refresh tree labels after edit

## 5. Frontend knowledge point delete UI

- [x] 5.1 Create `DeleteKnowledgePointButton` component with confirmation dialog, disabled for non-edit users and non-leaf nodes
- [x] 5.2 Add `knowledgeApi.deleteKnowledgePoint(textbookId, id)` service method
- [x] 5.3 Add tests for `DeleteKnowledgePointButton` covering confirm, cancel, and disabled states

## 6. Page integration and refresh

- [x] 6.1 Add edit and delete buttons to the knowledge point overview panel in `LearningPage`
- [x] 6.2 Add edit and delete buttons to the knowledge point overview panel in `SmartLearningPage`
- [x] 6.3 After successful edit, refresh the overview panel and tree node label
- [x] 6.4 After successful delete, refresh the knowledge tree, clear the selection, and refetch smart-learning recommendations on `SmartLearningPage`
- [x] 6.5 Update `SmartLearningPage` tests to cover the new buttons and mocks

## 7. Quality gates and documentation

- [x] 7.1 Run `pnpm typecheck` and fix any errors
- [x] 7.2 Run `pnpm lint` and fix lint issues
- [x] 7.3 Run `pnpm test` and address failures (excluding pre-existing environment-dependent failures)
- [x] 7.4 Review the OpenSpec change artifacts and run `openspec status` to verify apply-readiness
