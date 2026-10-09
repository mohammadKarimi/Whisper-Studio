# Decisions — issue #74

- Rendered the Studio confirmation modal as the first child of the page's outer
  flex column, gated only on `confirmOpen` (not on `record` being non-null).
  Reason: matches the dashboard's inline modal placement; the Delete button that
  opens it is already disabled when `!record`, so `confirmOpen` cannot be true
  with a null record in practice.
- Used `variant="outline"` for the header Delete button with
  `hover:text-destructive` (rather than `destructive`) to match the plan and the
  existing outline Save/Export buttons; the destructive emphasis lives on the
  modal's confirm button.
- Did not branch on the `{ ok }` result of `deleteTranscription`; call delete,
  clear the record, navigate. Consistent with the dashboard's `handleDelete`.
- `handleDelete` resets `deleting`/`confirmOpen` before navigating so a failed
  IPC call leaves the button usable rather than stuck spinning.
- Installed deps with `npm ci` (node_modules was empty in the worktree) to run
  typecheck/lint/test. All three passed: typecheck clean, eslint no issues,
  93/93 vitest tests pass.
