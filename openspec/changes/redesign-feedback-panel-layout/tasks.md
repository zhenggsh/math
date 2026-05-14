## 1. Adjust Bottom Panel Ratio

- [x] 1.1 Change `ResizableLayout` vertical split from fixed pixel to percentage (80:20)
- [x] 1.2 Verify `allotment` proportional layout works with percentage values
- [x] 1.3 Ensure `minSize` constraint still prevents panel from collapsing too small

## 2. Simplify LearningTimer Display

- [x] 2.1 Remove `Card` wrapper and `Statistic` component from `LearningTimer.tsx`
- [x] 2.2 Render as inline `<span>` with icon + label + time value
- [x] 2.3 Update `LearningTimer.module.css` to compact inline styles
- [x] 2.4 Fix pre-existing `setState in useEffect` lint issue
- [x] 2.5 Run `LearningTimer` tests to verify no regressions

## 3. Redesign FeedbackPanel Layout

- [x] 3.1 Remove `Card`, `Divider`, and `historySection` from `FeedbackPanel.tsx`
- [x] 3.2 Create upper section: flex row with `Title` "学习反馈" + `MasteryRating size="small"`
- [x] 3.3 Add compact `TextArea` with `rows={2}` in upper section
- [x] 3.4 Create lower section: flex row with space-between alignment
- [x] 3.5 Add "学习历史" button (left) with `HistoryOutlined` icon
- [x] 3.6 Add "提交" button (center) with `SaveOutlined` icon, `type="primary"`, `size="small"`
- [x] 3.7 Add `LearningTimer` compact display (right)
- [x] 3.8 Add `historyModalOpen` state and `Modal` containing `RecordHistory`
- [x] 3.9 Wire up form submission via `onFinish` with `void` operator for async handler
- [x] 3.10 Fix floating promise lint issues with `void` operator
- [x] 3.11 Update `FeedbackPanel.module.css` for two-section flex layout
- [x] 3.12 Run `pnpm --filter web typecheck` — zero errors

## 4. Update Tests

- [x] 4.1 Update `FeedbackPanel.test.tsx` assertions for new layout elements
- [x] 4.2 Replace "学习备注（可选）" label assertion with placeholder assertion
- [x] 4.3 Replace "提交学习记录" button text with "提交"
- [x] 4.4 Replace常驻 history section test with Modal open test
- [x] 4.5 Use `findByRole('dialog')` and `getByText('暂无学习记录')` for Modal verification
- [x] 4.6 Run all learning component tests — 18/18 pass

## 5. Lint & Format

- [x] 5.1 Run `pnpm --filter web lint` on modified files
- [x] 5.2 Auto-fix prettier formatting issues
- [x] 5.3 Verify zero lint errors on modified files

## 6. Commit

- [x] 6.1 Stage modified files
- [x] 6.2 Write commit message summarizing layout redesign
- [x] 6.3 Commit to master

## 7. OpenSpec Artifacts

- [x] 7.1 Write `proposal.md`
- [x] 7.2 Write `design.md`
- [ ] 7.3 Write delta spec to `specs/learning-feedback/spec.md`
