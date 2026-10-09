# Plan: Delete button on the Studio page

## Goal

When a transcription is open in the Studio page, the user can click a Delete
button to permanently remove that transcription from disk and be returned to
the dashboard.

## Approach

The delete plumbing already exists end-to-end and needs no backend changes:

- Main process: `src/main/ipc/transcription/records.ts` registers
  `IPC_CHANNELS.deleteTranscription` (`transcriptions:delete`), which removes
  the transcription's output folder (including `whisper-studio.json`, exported
  files, and the copied source file).
- Preload: `src/preload/index.ts` already exposes it as
  `desktop.deleteTranscription(id)`.
- Shared type: `TranscriptionApi.deleteTranscription` already exists in
  `src/shared/ipc/api.ts`.

The work is renderer-only, in two files:

1. `src/renderer/src/features/studio/index.tsx`
   - Add `useState` to the existing React import and add `Trash2` to the
     existing `lucide-react` import.
   - Add two pieces of local state: `confirmOpen` (boolean) and `deleting`
     (boolean).
   - Add a `handleDelete` async function that:
     - returns early if `record` is null,
     - sets `deleting` to true,
     - calls `desktop.deleteTranscription(record.id)`,
     - clears the shared record via `setRecord(null)`,
     - resets `deleting`/`confirmOpen`,
     - calls `navigateTo('dashboard')`.
   - Add a Delete button in the header actions row (next to the existing Save
     and Export buttons): `variant="outline"`, `size="sm"`, `Trash2` icon plus
     the `captions.studio.actions.delete` label, `disabled={!record || deleting}`,
     `onClick={() => setConfirmOpen(true)}`.
   - Render an inline confirmation modal when `confirmOpen` is true, matching
     the modal pattern already used in
     `src/renderer/src/features/dashboard/components/transcription-grid.tsx`
     (fixed overlay, card, Cancel + destructive Delete buttons). The destructive
     button shows a `Loader2` spinner while `deleting` and calls `handleDelete`.

2. `src/renderer/src/lib/strings.ts`
   - Add `delete: 'Delete'` to `captions.studio.actions`.
   - Add a new `captions.studio.confirmDelete` object with `title`,
     `description`, `cancel`, `confirm`, and `deleting` strings.

## Decisions

- Reuse the existing `desktop.deleteTranscription` IPC; do not add or change any
  main-process, preload, or shared IPC code.
- Require a confirmation modal before deleting, consistent with the dashboard's
  existing delete confirmation.
- After a successful delete call, clear the shared Studio record
  (`setRecord(null)`) and navigate to `dashboard` so the now-deleted
  transcription does not linger in the Studio UI. The dashboard refetches its
  list on mount.
- Keep error handling minimal and consistent with the existing dashboard
  `handleDelete`: call delete, clear/navigate, and do not branch on the
  `{ ok }` result.

## Assumptions

- "when enter to studio page" means "on the Studio page" (a button to delete the
  currently open transcription), not "automatically delete when the page opens".
- Deleting the transcription removes its whole output folder; that already
  includes the copied source file, which is acceptable.
- A simple confirmation modal is sufficient; no special handling of unsaved
  edits beyond the modal's permanent-deletion warning.

## Out of scope

- No changes to the dashboard delete flow, Settings "Delete all", the export
  page, or the new-transcription flow.
- No new reusable modal component; the Studio modal is inline, matching the
  existing dashboard modal.
- No new unit tests: the existing Vitest setup runs only `tests/unit/**/*.test.ts`
  in a Node environment, and this change is UI-only. Verification is via
  typecheck/lint/tests/build.

## How to verify

From the repo root:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build` (runs typecheck plus `electron-vite build`)
