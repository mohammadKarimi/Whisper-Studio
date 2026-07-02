import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteAllConfirmModalProps {
  open: boolean
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteAllConfirmModal({
  open,
  deleting,
  onCancel,
  onConfirm
}: DeleteAllConfirmModalProps): JSX.Element | null {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-all-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="delete-all-title" className="text-base font-semibold text-foreground">
              Delete all transcriptions?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This permanently removes all saved transcription records and output files from disk.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={deleting} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={deleting} onClick={onConfirm}>
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete All
          </Button>
        </div>
      </div>
    </div>
  )
}
