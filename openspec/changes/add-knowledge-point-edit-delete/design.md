## Context

The `add-knowledge-point-edit-delete` change builds on the recently completed "add child knowledge point" feature. That feature added a toolbar button and modal to create level-2 and level-3 knowledge points under an existing parent, persisted them to the database, and appended a placeholder content block to the textbook markdown file. The current task completes the knowledge-point lifecycle by adding in-place edit and delete actions in the overview panel.

The overview panel is shared by `LearningPage` and `SmartLearningPage`, so new UI elements must be reusable and role-aware (only teachers and admins can mutate data). The backend already has `KnowledgePointService` and `TextbookService` with helper logic for locating markdown blocks; these can be extended rather than replaced.

## Goals / Non-Goals

**Goals:**

- Allow authorized users to edit a knowledge point's `code`, `name`, `definition`, `characteristics`, and `importanceLevel` directly from the overview panel, persisting changes only to the database. When `code` changes, recompute `level1`, `level2`, and `level3` and reject the update if the new code already exists in the same textbook.
- Allow authorized users to delete a knowledge point, removing its database row and its corresponding markdown content block from the textbook `.md` file.
- Reuse the existing `ParentKnowledgeNode` abstraction and role-based gating already introduced for "add child knowledge point".
- Keep the database and markdown file consistent after a delete operation.
- Mark the existing add-child-knowledge-point tasks as completed in the implementation plan.

**Non-Goals:**

- Reordering or reparenting knowledge points.
- Editing the body text of the markdown file itself (edit only touches DB fields).
- Bulk delete or bulk edit operations.
- Cascade deletion of child nodes; deleting a parent with children is rejected to prevent accidental data loss.

## Decisions

1. **Edit updates only the database.**
   - **Rationale:** Markdown content is treated as authored material that may contain diagrams, examples, and formatting. Editing the overview metadata should not silently rewrite authored content. If a teacher later wants to edit the markdown body, that will be a separate capability.

2. **Edit allows updating the knowledge point code and name, but still does not touch the markdown file.**
   - **Rationale:** Teachers need to correct typos in the code or display name without re-importing the entire textbook. Changing the code recomputes `level1`/`level2`/`level3` and is rejected if it duplicates another code in the same textbook. The content block in the markdown file is referenced by a stable ID, so renaming the code remains DB-only.

3. **Delete first removes the DB row, then rewrites the markdown file inside a single service method.**
   - **Rationale:** A file rewrite is not transactionally safe, but grouping it with the DB delete in one service call makes the failure surface easier to reason about. If the file rewrite fails, the DB change has already been committed; we will log the error and surface it to the user rather than attempt a rollback that could corrupt the markdown file.

4. **Deletion of non-leaf nodes is rejected.**
   - **Rationale:** Prevents orphan children and accidental loss of entire subtrees. Users must delete or restructure children before removing a parent. This is simpler and safer than a cascade-delete policy for this first iteration.

5. **Markdown block removal reuses `TextbookService.findContentBlockRange`.**
   - **Rationale:** The existing helper already understands how a knowledge-point code maps to a heading range in the textbook markdown. Extending it to return a removable block keeps the file-format logic in one place.

6. **Frontend edit and delete buttons use the same Ant Design modal/confirmation patterns as the add-child modal.**
   - **Rationale:** Consistency with the recently shipped feature reduces UI surprises and keeps role-based disabling simple.

## Risks / Trade-offs

- **Data loss during concurrent markdown edits.** Two teachers editing the same textbook could race when one deletes a block. The current file-based storage does not support locking, so the last writer wins. **Mitigation:** surface a clear confirmation dialog and restrict delete permissions to admins/teachers.
- **Deleting a parent accidentally blocked by children.** Teachers may expect a cascade delete. **Mitigation:** communicate in the UI that children must be removed first, and consider cascade delete as a future enhancement.
- **DB and markdown drift if file rewrite fails after DB delete.** The knowledge point will be gone from the database but its content block may remain in the file. **Mitigation:** log the failure, return an error to the frontend, and provide an admin-visible message so the drift can be manually corrected.

## Open Questions

- None. All requirements are clarified by the user request.
