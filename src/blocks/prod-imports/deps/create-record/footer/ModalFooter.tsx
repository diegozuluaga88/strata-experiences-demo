import { ArrowRight } from 'lucide-react'

interface ModalFooterProps {
    canCreate: boolean
    onCancel: () => void
    onCreate: () => void
}

export default function ModalFooter({ canCreate, onCancel, onCreate }: ModalFooterProps) {
    return (
        <footer className="h-[60px] px-6 flex items-center justify-end gap-2 border-t border-border bg-muted/30">
            <button
                onClick={onCancel}
                title="Discard all changes and close the modal"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition-colors"
            >
                Cancel
            </button>
            <button
                disabled={!canCreate}
                onClick={onCreate}
                title={canCreate
                    ? 'Create the record in Orderbahn with the validated values'
                    : 'Resolve all required fields before creating the record'}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold transition ${
                    canCreate
                        ? 'bg-brand-300 dark:bg-brand-500 text-zinc-900 hover:bg-brand-400 dark:hover:bg-brand-600/80 shadow-[0_6px_20px_-4px_rgba(198,228,51,0.7)]'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
            >
                Create Record
                <ArrowRight className="size-3.5" />
            </button>
        </footer>
    )
}
