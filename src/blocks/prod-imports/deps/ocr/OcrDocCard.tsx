import { FileText, AlertCircle, CheckCircle2, Send, Trash2 } from 'lucide-react'
import { getTeamMember, avatarGradient } from '../team/teamMembers'
import DocTypeChip from './DocTypeChip'

export type OcrDocStatus = 'identified' | 'capturing' | 'inconsistencies' | 'in_progress' | 'processed' | 'completed' | 'deprecated'
export type OcrDocType = 'Purchase Order' | 'Acknowledgment' | 'Invoice' | 'Quote'

export interface OcrDocCardData {
    id: string
    name: string
    vendor: string
    type: OcrDocType
    status: OcrDocStatus
    lineItems: number
    date: string
    assigneeId?: string
    /** Linked counterpart doc id — if set, the card shows a Compare action. */
    relatedDocId?: string
}

interface OcrDocCardProps {
    doc: OcrDocCardData
    onPreview: () => void
    // DE1.12 · Diego 2026-09-02 · onMarkCompleted removido · el botón
    // "Mark as Completed" no existe en gostrata.app premain.
    onPreflightSync: () => void
    onDeprecate: () => void
    /** FB-06b · multi-select state · si onToggleSelect provisto, checkbox aparece. */
    selected?: boolean
    onToggleSelect?: () => void
    // DE1.18 · Diego 2026-09-02 · onCompareLinked removido · el botón grande
    // "Compare linked documents" no aparece en gostrata.app premain (las OCR
    // cards son minimalistas). El flow de comparación vive en /comparisons.
}

// Best-effort relative time. Accepts seed strings ("Today, 2:30 PM",
// "Yesterday", "2 days ago") and ISO dates, returns "21 days ago" form.
function formatRelativeTime(input: string): string {
    if (!input) return '—'
    const lower = input.toLowerCase()
    if (lower.startsWith('today')) return 'today'
    if (lower.startsWith('yesterday')) return 'yesterday'
    const daysMatch = lower.match(/^(\d+)\s+days?\s+ago/)
    if (daysMatch) return `${daysMatch[1]} days ago`
    const parsed = new Date(input)
    if (!isNaN(parsed.getTime())) {
        const days = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000))
        if (days === 0) return 'today'
        if (days === 1) return 'yesterday'
        return `${days} days ago`
    }
    return input
}

export default function OcrDocCard({ doc, onPreview, onPreflightSync, onDeprecate, selected, onToggleSelect }: OcrDocCardProps) {
    const assignee = getTeamMember(doc.assigneeId)
    // For non-Reconciled/Completed states the 4 icons default to In-Progress mapping
    // (per Diego decision 2026-06-09 — confirm with prod for other states later).
    const isReconciled = doc.status === 'processed' || doc.status === 'completed'

    return (
        <div className={`group bg-card border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
            selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
        }`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                        {onToggleSelect && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
                                className="h-5 w-5 rounded border-2 border-border flex items-center justify-center shrink-0 mt-1.5 transition-colors hover:border-primary"
                                style={selected ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' } : undefined}
                                title={selected ? 'Deselect' : 'Select for batch feedback'}
                                aria-label={selected ? 'Deselect document' : 'Select document'}
                            >
                                {selected && (
                                    <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>
                        )}
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground truncate">{doc.vendor}</span>
                                <DocTypeChip type={doc.type} size="sm" />
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{doc.id}</div>
                        </div>
                    </div>
                    {assignee && (
                        <div
                            title={assignee.name}
                            className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(assignee.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                        >
                            {assignee.initials}
                        </div>
                    )}
                </div>

                <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Filename</span>
                        <span title={doc.name} className="font-semibold text-foreground truncate ml-2 max-w-[180px]">{doc.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Line Items</span>
                        <span className="font-semibold text-foreground">{doc.lineItems} line items</span>
                    </div>
                </div>

                {/* DE1.18 · Diego 2026-09-02 · botón "Compare linked documents"
                    removido · no aparece en gostrata.app premain (las OCR cards
                    son minimalistas). El flow de comparación vive en /comparisons. */}

                <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(doc.date)}</span>
                    <div className="flex items-center gap-1">
                        {/* Action icons — colors use Tailwind raw to match prod (yellow/green/red).
                            DS semantic tokens (warning/success/destructive) skew orange-ish here. */}
                        {isReconciled ? (
                            <span
                                title="Reviewed"
                                className="p-1.5 rounded-md text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-500/15 inline-flex"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                            </span>
                        ) : (
                            <span
                                title="Pending For Review"
                                className="p-1.5 rounded-md text-yellow-600 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-500/15 inline-flex"
                            >
                                <AlertCircle className="h-4 w-4" />
                            </span>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onPreview() }}
                            title="Review Fields"
                            aria-label="Review document fields"
                            className="p-1.5 rounded-md text-foreground hover:bg-muted transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                        </button>
                        {/* DE1.14/15 · Diego 2026-09-02 · Preflight Sync visible tanto en
                            In Review (in_progress) como en Ready to Sync (processed) para
                            paridad con gostrata.app premain. En In Review el botón está
                            DESHABILITADO con tooltip "Awaiting full review" (icono lighter
                            + cursor-not-allowed) · solo en Ready to Sync es funcional. */}
                        {doc.status === 'in_progress' && (
                            <span
                                title="Awaiting full review"
                                aria-label="Preflight Sync (disabled — awaiting full review)"
                                className="p-1.5 rounded-md text-green-400 bg-green-50/60 dark:text-green-500 dark:bg-green-500/10 inline-flex cursor-not-allowed opacity-70"
                            >
                                <Send className="h-4 w-4" />
                            </span>
                        )}
                        {isReconciled && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onPreflightSync() }}
                                title="Preflight Sync"
                                aria-label="Preflight Sync"
                                className="p-1.5 rounded-md text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-500/15 hover:brightness-95 transition-all"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        )}
                        {/* DE1.12 · Diego 2026-09-02 · botón Mark as Completed
                            removido · no existe en gostrata.app premain (ambos
                            estados: activo verde para reconciled y disabled). */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeprecate() }}
                            title="Deprecate"
                            aria-label="Deprecate document"
                            className="p-1.5 rounded-md text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/15 hover:brightness-95 transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
