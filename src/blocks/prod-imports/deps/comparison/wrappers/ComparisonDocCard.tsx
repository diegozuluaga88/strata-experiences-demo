// DE1.18 · Diego 2026-09-02 · wrapper local · card OCR-style para Comparisons ·
// Layout idéntico al de `OcrDocCard.tsx` para paridad visual con prod
// (dev.gostrata.app/expert-hub/comparisons donde las cards son minimalistas).
// Vive en `wrappers/` para respetar el contrato lift-and-copy · NO editamos
// `src/components/comparison/*` core (regla dura CLAUDE.md).
//
// El único ícono de acción "compare" (GitCompare) es el añadido que no
// existía en la OcrDocCard · abre el `ComparisonReviewModal` vía el
// `ComparisonLauncher` que ya está montado en `Comparisons.tsx`.

import { FileText, CheckCircle2, AlertCircle, GitCompare, Send, Trash2 } from 'lucide-react'
import DocTypeChip from '../../ocr/DocTypeChip'
import { avatarGradient, getTeamMember, CURRENT_USER_ID } from '../../team/teamMembers'

export type CompareDocType = 'Purchase Order' | 'Acknowledgment'
export type CompareReviewStatus = 'Reviewed' | 'Pending For Review'

export interface ComparisonCardData {
    id: string
    vendor: string
    type: CompareDocType
    name: string
    lineItems: number
    date: string
    initials: string
    reviewStatus: CompareReviewStatus
    /** Match display in prod · sub-code line under the vendor name (ej. "KT2131.001.01"). */
    subCode?: string
    /** Counterpart doc · presencia habilita el botón compare + el plane. */
    relatedPo?: string
    // DE1.21 · Diego 2026-09-03 · reviewer asignado · el avatar muestra
    // sus iniciales · fallback 'me' (Diego Zuluaga).
    assigneeId?: string
}

interface Props {
    doc: ComparisonCardData
    onCompare: () => void
    onPreview?: () => void
    onDelete?: () => void
    onSend?: () => void
    // DE1.19 · Diego 2026-09-03 · default true · pasar false para ocultar
    // el botón Compare (ej. cards Purchase Orders donde el flujo aún no aplica).
    showCompare?: boolean
}

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

export default function ComparisonDocCard({ doc, onCompare, onPreview, onDelete, onSend, showCompare = true }: Props) {
    const isReviewed = doc.reviewStatus === 'Reviewed'
    const hasCounterpart = !!doc.relatedPo
    // DE1.21 · Diego 2026-09-03 · avatar del reviewer (persona), no vendor.
    const reviewer = getTeamMember(doc.assigneeId ?? CURRENT_USER_ID) ?? getTeamMember(CURRENT_USER_ID)!

    return (
        <div className="group bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground truncate">{doc.vendor}</span>
                                <DocTypeChip type={doc.type} size="sm" />
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{doc.subCode ?? doc.id}</div>
                        </div>
                    </div>
                    {/* DE1.21 · avatar del reviewer asignado (persona · match prod
                        tooltip "Assigned to <name>") · antes mostraba iniciales del
                        vendor confundiendo con la marca. */}
                    <div
                        title={`Assigned to ${reviewer.name}`}
                        className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(reviewer.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                    >
                        {reviewer.initials}
                    </div>
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

                <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(doc.date)}</span>
                    <div className="flex items-center gap-1">
                        {/* Reviewed / Pending indicator · match OcrDocCard L134-148 */}
                        {isReviewed ? (
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
                        {/* Preview */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onPreview?.() }}
                            title="Preview Fields"
                            aria-label="Preview document fields"
                            className="p-1.5 rounded-md text-foreground hover:bg-muted transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                        </button>
                        {/* Compare · NUEVO icono de acción · abre ComparisonReviewModal.
                            DE1.19 · gated por `showCompare` (oculto en cards PO por ahora).
                            DE1.24 · Diego 2026-09-03 · color brand-lime (DS · brand-300/500)
                            para diferenciarlo del resto · acción "hero" de Comparisons. */}
                        {showCompare && hasCounterpart && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCompare() }}
                                title="Compare PO ↔ ACK"
                                aria-label="Compare against linked counterpart"
                                className="p-1.5 rounded-md bg-brand-300/30 text-foreground border border-brand-300/50 hover:bg-brand-300/50 dark:bg-brand-500/15 dark:border-brand-500/40 dark:hover:bg-brand-500/25 transition-colors"
                            >
                                <GitCompare className="h-4 w-4" />
                            </button>
                        )}
                        {/* Delete */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                            title="Delete"
                            aria-label="Delete document"
                            className="p-1.5 rounded-md text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/15 hover:brightness-95 transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        {/* Send · visible cuando el doc está reviewed */}
                        {isReviewed && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSend?.() }}
                                title="Send"
                                aria-label="Send"
                                className="p-1.5 rounded-md text-green-600 hover:bg-muted transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
