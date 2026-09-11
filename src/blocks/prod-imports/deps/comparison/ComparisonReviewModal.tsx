import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'
import { X, ArrowLeftRight, Loader2, CheckCircle2, XCircle, MessageSquareWarning, GitCompare, Check, X as XMark, FileText, Download } from 'lucide-react'
import type { ComparisonReport, DecisionAction } from './comparisonTypes'
import type { TeamMember } from '../team/teamMembers'
import DerivedStatusBadge from './DerivedStatusBadge'
import AckSummaryCard from './AckSummaryCard'
import DiscrepancyList from './DiscrepancyList'
import AssignReviewerModal from './AssignReviewerModal'
import PdfPreviewModal from './PdfPreviewModal'

interface PreviewDoc {
    id: string
    name: string
    vendor: string
    type: string
}

interface ComparisonReviewModalProps {
    isOpen: boolean
    onClose: () => void
    /** null while processing. */
    report: ComparisonReport | null
    /** When true, render the spinner instead of the report. */
    processing: boolean
    /** Reviewer is populated only when action === 'REQUEST_REVIEW' and the
        user picked a teammate to assign the report to. */
    onDecision?: (action: DecisionAction, reviewer?: TeamMember) => void
}

// ST-1169 Fase 4.2 · Diego 2026-09-09 · labels dealer-friendly (Nielsen H2
// · match real world · sin exponer enum names crudos al usuario).
function routingLabel(routing: ComparisonReport['routing']): string {
    switch (routing.routing_decision) {
        case 'MANDATORY_REVIEW':   return 'Mandatory Review'
        case 'SUGGESTED_REVIEW':   return 'Suggested Review'
        case 'AUTO_APPLY_ELIGIBLE': return 'Auto-apply Eligible'
    }
}

function actionButtonClasses(action: DecisionAction, suggested?: DecisionAction): string {
    const isSuggested = action === suggested
    if (action === 'ACCEPT') {
        return isSuggested
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-background border border-border text-foreground hover:bg-muted'
    }
    if (action === 'REJECT') {
        return isSuggested
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-background border border-border text-foreground hover:bg-muted'
    }
    return isSuggested
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'bg-background border border-border text-foreground hover:bg-muted'
}

// ST-1169 · Diego 2026-09-09 · Action Required (summary) tab suprimido ·
// las decisiones ahora se toman inline por línea en la tab Line Items
// (Accept ACK / Keep PO botones en Status column). Default arranca en
// Line Items directamente.
type ReviewTab = 'fields' | 'lineItems'

function MatchedPill({ matched }: { matched: boolean }) {
    if (matched) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300 whitespace-nowrap">
                <Check className="h-3 w-3" />
                Match
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 whitespace-nowrap">
            <XMark className="h-3 w-3" />
            Differs
        </span>
    )
}

export default function ComparisonReviewModal({ isOpen, onClose, report, processing, onDecision }: ComparisonReviewModalProps) {
    const [tab, setTab] = useState<ReviewTab>('lineItems')
    // ST-1169 Fase 2.D · Diego 2026-09-09 · filtro "solo discrepancias"
    // que reemplaza el ex-tab Action Required · el user puede narrow-down
    // a las filas con mismatch sin dejar la tabla apilada.
    const [onlyDiffs, setOnlyDiffs] = useState(false)
    // ST-1169 Fase 2.D · Diego 2026-09-09 · state local de decisiones
    // per-línea del user en la tab Line Items · Map<line, 'accept-ack' |
    // 'keep-po'>. Se reset al abrir el modal (via useEffect línea 87).
    // Undo = delete de la map para retornar al estado pending con botones.
    const [resolutions, setResolutions] = useState<Map<number, 'accept-ack' | 'keep-po'>>(new Map())
    const [showAssignReviewer, setShowAssignReviewer] = useState(false)
    const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null)

    // Reset to Summary every time the modal re-opens (avoid sticky tabs across reports).
    useEffect(() => {
        if (isOpen) {
            setTab('lineItems')
            setShowAssignReviewer(false)
            setPreviewDoc(null)
            setResolutions(new Map())
            setOnlyDiffs(false)
        }
    }, [isOpen, report?.report_id])

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-[200]">
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-[95vw] max-w-[1400px] h-[90vh] max-h-[920px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">

                            {/* Processing state */}
                            {processing && (
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="h-14 w-14 rounded-full bg-brand-300/30 dark:bg-brand-500/20 flex items-center justify-center mb-4">
                                        <Loader2 className="h-7 w-7 text-zinc-800 dark:text-zinc-200 animate-spin" />
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground mb-1">Comparing documents…</h2>
                                    <p className="text-sm text-muted-foreground">Strata AI is validating a Purchase Order against an Acknowledgement — checking fields, line items, quantities, and pricing.</p>
                                </div>
                            )}

                            {/* Report state */}
                            {!processing && report && (
                                <>
                                    {/* Header */}
                                    <div className="p-5 border-b border-border">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <GitCompare className="h-4 w-4 text-muted-foreground" />
                                                <h2 className="text-base font-bold text-foreground">Compare linked documents</h2>
                                                <DerivedStatusBadge status={report.derived_status} size="sm" />
                                            </div>
                                            <button
                                                onClick={onClose}
                                                aria-label="Close"
                                                className="p-1.5 -m-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto">
                                            <span className="text-muted-foreground">Purchase Order:</span>
                                            <span className="font-mono font-semibold text-foreground">{report.po_number}</span>
                                            <ArrowLeftRight className="h-3 w-3 shrink-0" />
                                            <span className="text-muted-foreground">Acknowledgement:</span>
                                            <span className="font-mono font-semibold text-foreground">{report.ack_id}</span>
                                            <span>·</span>
                                            <span>{report.vendor}</span>
                                            <span>·</span>
                                            <span>{Math.round(report.overall_similarity_score * 100)}% match</span>
                                            <span>·</span>
                                            <span>Run #{report.run_number}</span>
                                        </div>
                                    </div>

                                    {/* Tabs — Review (priority) + Fields + Line Items */}
                                    {(() => {
                                        const isCritical = report.derived_status === 'CRITICAL_ISSUES'
                                        const isReviewNeeded = report.derived_status === 'REQUIRES_REVIEW'
                                        const isClean = report.derived_status === 'EXACT_MATCH' || report.derived_status === 'VERIFIED_WITH_MINOR_CHANGES'
                                        const reviewLabel = isCritical
                                            ? 'Action Required'
                                            : isReviewNeeded
                                                ? 'Needs Review'
                                                : isClean
                                                    ? 'AI Review'
                                                    : 'Review'
                                        const dotClass = isCritical
                                            ? 'bg-red-500 animate-pulse'
                                            : isReviewNeeded
                                                ? 'bg-yellow-500 animate-pulse'
                                                : isClean
                                                    ? 'bg-green-500'
                                                    : 'bg-zinc-400'
                                        const activeBg = isCritical
                                            ? 'bg-red-50 dark:bg-red-500/10'
                                            : isReviewNeeded
                                                ? 'bg-yellow-50 dark:bg-yellow-500/10'
                                                : 'bg-brand-300/20 dark:bg-brand-500/10'
                                        // ST-1169 · Diego 2026-09-09 · dot + label del ex-tab
                                        // Action Required se preservan como resumen VISUAL
                                        // (readonly) al lado de los tabs · el usuario ve el
                                        // status del report sin necesidad de un tab dedicado.
                                        void isCritical; void isReviewNeeded; void isClean; void activeBg
                                        return (
                                            <div className="px-5 border-b border-border flex items-center gap-1 flex-wrap">
                                                <span
                                                    className="inline-flex items-center gap-2 px-2 py-1 text-sm font-bold text-foreground my-1"
                                                    title={`Status: ${reviewLabel}`}
                                                >
                                                    <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                                                    {reviewLabel}
                                                </span>
                                                <span className="text-muted-foreground/40 mx-1">·</span>
                                                <button
                                                    onClick={() => setTab('fields')}
                                                    className={`relative py-2.5 px-3 my-1 text-sm font-bold inline-flex items-center gap-2 rounded-md transition-colors ${
                                                        tab === 'fields' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    Fields
                                                    <span className="text-[10px] font-bold bg-card border border-border text-muted-foreground px-1.5 py-0.5 rounded-full">{report.validated_fields?.length ?? 0}</span>
                                                    {tab === 'fields' && <span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary rounded-t-full" />}
                                                </button>
                                                <button
                                                    onClick={() => setTab('lineItems')}
                                                    className={`relative py-2.5 px-3 my-1 text-sm font-bold inline-flex items-center gap-2 rounded-md transition-colors ${
                                                        tab === 'lineItems' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    Line Items
                                                    <span className="text-[10px] font-bold bg-card border border-border text-muted-foreground px-1.5 py-0.5 rounded-full">{report.validated_line_items?.length ?? 0}</span>
                                                    {tab === 'lineItems' && <span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary rounded-t-full" />}
                                                </button>

                                                {/* View originals — pushed to the right of the tabs row */}
                                                <div className="ml-auto flex items-center gap-1.5 my-1">
                                                    <button
                                                        onClick={() => setPreviewDoc({
                                                            id: report.po_number,
                                                            name: `${report.po_number}.pdf`,
                                                            vendor: report.vendor,
                                                            type: 'Purchase Order',
                                                        })}
                                                        title={`Preview the original Purchase Order ${report.po_number}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="hidden md:inline">Purchase Order:</span>
                                                        <span className="font-mono">{report.po_number}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setPreviewDoc({
                                                            id: report.ack_id,
                                                            name: `${report.ack_id}.pdf`,
                                                            vendor: report.vendor,
                                                            type: 'Acknowledgement',
                                                        })}
                                                        title={`Preview the original Acknowledgement ${report.ack_id}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="hidden md:inline">Acknowledgement:</span>
                                                        <span className="font-mono">{report.ack_id}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Body — tab content */}
                                    <div className="flex-1 overflow-y-auto p-5">
                                        {/* ST-1169 · Diego 2026-09-09 · summary tab suprimido ·
                                            las discrepancias se resuelven inline por línea en
                                            la tab Line Items · el toggle "Show only diffs"
                                            arriba de esa tabla cumple el rol del ex-tab. */}
                                        {tab === 'fields' && (
                                            <div className="border border-border rounded-xl overflow-hidden">
                                                <div className="grid grid-cols-[1.4fr_1fr_1fr_80px] bg-muted/30 border-b border-border px-4 py-2.5">
                                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Field</div>
                                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PO value</div>
                                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ACK value</div>
                                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Status</div>
                                                </div>
                                                {(report.validated_fields ?? []).length === 0 ? (
                                                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">No fields validated.</div>
                                                ) : (report.validated_fields ?? []).map((f, idx) => (
                                                    <div key={idx} className={`grid grid-cols-[1.4fr_1fr_1fr_80px] gap-2 px-4 py-3 items-center border-b border-border last:border-b-0 ${f.matched ? '' : 'bg-red-50/30 dark:bg-red-500/5'}`}>
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">{f.field_label}</div>
                                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.category.replace('_', ' ')}</div>
                                                        </div>
                                                        <div className={`text-sm font-mono ${f.matched ? 'text-foreground' : 'text-muted-foreground line-through decoration-red-400/60'}`}>{f.po_value}</div>
                                                        <div className={`text-sm font-mono ${f.matched ? 'text-foreground' : 'text-red-700 dark:text-red-300 font-semibold'}`}>{f.ack_value}</div>
                                                        <div className="flex justify-end"><MatchedPill matched={f.matched} /></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {tab === 'lineItems' && (
                                            // ST-1169 · Diego 2026-09-09 · line items table refactor
                                            // al patrón CORE literal (screencap Officeworks · 2026-09-09):
                                            //
                                            // Columnas COMPLETAS CORE-parity: Match · Item # · Source
                                            // (badge PO/ACK) · Qty · Model · Description · List ·
                                            // Discount · Unit Cost · Total Cost · Required Ship · Ack
                                            // Ship Date · Status. List/Discount/Total/Ship dates son
                                            // derivados del mock (unit_price · qty) porque el shape
                                            // ValidatedLineItem no los trae aún · Fase 3 va a extender
                                            // el schema real via SuiteQL/REST del business system.
                                            //
                                            // Cada line item = 2 filas físicas stacked (PO dark ·
                                            // ACK blue) con diff-tint per-cell. Resolver inline
                                            // ("Accept ACK" / "Keep PO") en Status para diffs.
                                            (() => {
                                                const parseCost = (s: string) => {
                                                    const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
                                                    return isNaN(n) ? 0 : n
                                                }
                                                const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                const DISCOUNT_PCT = 62 // typical CORE discount %
                                                const REQUIRED_SHIP = '02/28/2026'
                                                const ACK_SHIP_MATCH = '02/28/2026'
                                                const ACK_SHIP_DIFF = '02/20/2026'
                                                // ST-1169 · Diego 2026-09-10 · column highlight per-cell (CORE + Figma parity).
                                                // Reemplaza el row-level tint suave por un tint saturado per-cell aplicado a
                                                // TANTO la fila PO como la ACK del column que diverge · el usuario escanea por
                                                // columna y ve full-height dónde está el diff, no solo un texto rojo.
                                                const diffCellBg = 'bg-red-100 dark:bg-red-500/20'
                                                const allItems = report.validated_line_items ?? []
                                                const items = onlyDiffs ? allItems.filter(i => !i.matched) : allItems
                                                const diffCount = allItems.filter(i => !i.matched).length
                                                const resolvedCount = allItems.filter(i => !i.matched && resolutions.has(i.line)).length
                                                const pendingCount = diffCount - resolvedCount
                                                return (
                                                    <div className="space-y-3">
                                                        {/* Toolbar · filtro "Show only discrepancies" (ex-tab Action Required) */}
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-xs text-muted-foreground">
                                                                Showing <strong className="text-foreground">{items.length}</strong> of {allItems.length} line items
                                                                {diffCount > 0 && (
                                                                    <>
                                                                        {' · '}
                                                                        <span className={pendingCount === 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                                                            {resolvedCount} of {diffCount} discrepancies resolved
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={onlyDiffs}
                                                                    onChange={e => setOnlyDiffs(e.target.checked)}
                                                                    className="rounded border-border"
                                                                />
                                                                Show only discrepancies
                                                            </label>
                                                        </div>
                                                    <div className="border border-border rounded-xl overflow-x-auto">
                                                        <table className="w-full min-w-[1400px]">
                                                            <thead>
                                                                <tr className="border-b border-border bg-muted/30">
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Match</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Item #</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Source</th>
                                                                    <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Qty</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Model</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Description</th>
                                                                    <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">List</th>
                                                                    <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Discount</th>
                                                                    <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Unit Cost</th>
                                                                    <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Total Cost</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Required Ship</th>
                                                                    <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Ack Ship Date</th>
                                                                    <th className="sticky right-0 z-10 bg-muted text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2.5 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {items.length === 0 ? (
                                                                    <tr><td colSpan={13} className="px-3 py-8 text-center text-xs text-muted-foreground">
                                                                        {onlyDiffs ? 'No discrepancies · all line items match. Toggle off to see all.' : 'No line items validated.'}
                                                                    </td></tr>
                                                                ) : items.flatMap(li => {
                                                                    const qtyDiff = li.po_quantity !== li.ack_quantity
                                                                    const costDiff = li.po_unit_price !== li.ack_unit_price
                                                                    const rowBg = li.matched ? '' : 'bg-red-50/30 dark:bg-red-500/5'
                                                                    // Derived values · List = unitCost / (1 - discount)
                                                                    const poCostNum = parseCost(li.po_unit_price)
                                                                    const ackCostNum = parseCost(li.ack_unit_price)
                                                                    const poListNum = poCostNum / (1 - DISCOUNT_PCT / 100)
                                                                    const ackListNum = ackCostNum / (1 - DISCOUNT_PCT / 100)
                                                                    const poTotalNum = poCostNum * li.po_quantity
                                                                    const ackTotalNum = ackCostNum * li.ack_quantity
                                                                    const totalDiff = poTotalNum !== ackTotalNum
                                                                    const ackShipDate = li.matched ? ACK_SHIP_MATCH : ACK_SHIP_DIFF
                                                                    const shipDiff = REQUIRED_SHIP !== ackShipDate
                                                                    return [
                                                                        <tr key={`${li.line}-po`} className={`${rowBg} align-middle`}>
                                                                            <td rowSpan={2} className="px-3 py-3 text-xs font-bold text-muted-foreground border-b border-border">{li.matched ? 'Yes' : 'No'}</td>
                                                                            <td rowSpan={2} className="px-3 py-3 text-sm font-mono text-muted-foreground border-b border-border">{li.line}</td>
                                                                            <td className="px-3 py-2 border-b border-dashed border-border/60">
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-foreground text-background uppercase tracking-wider">PO</span>
                                                                            </td>
                                                                            <td className={`px-3 py-2 text-sm font-mono text-right border-b border-dashed border-border/60 ${qtyDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{li.po_quantity}</td>
                                                                            <td className="px-3 py-2 text-sm font-mono font-semibold text-foreground border-b border-dashed border-border/60">{li.product_number}</td>
                                                                            <td className="px-3 py-2 text-sm text-foreground border-b border-dashed border-border/60 max-w-[140px] truncate" title={li.description}>{li.description}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right border-b border-dashed border-border/60 ${costDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{fmt(poListNum)}</td>
                                                                            <td className="px-3 py-2 text-sm font-mono tabular-nums text-right text-muted-foreground border-b border-dashed border-border/60">{DISCOUNT_PCT}.00</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right border-b border-dashed border-border/60 ${costDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{li.po_unit_price}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right border-b border-dashed border-border/60 ${totalDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{fmt(poTotalNum)}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono border-b border-dashed border-border/60 ${shipDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{REQUIRED_SHIP}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono border-b border-dashed border-border/60 ${shipDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-foreground'}`}>{ackShipDate}</td>
                                                                            <td rowSpan={2} className={`sticky right-0 z-10 px-3 py-3 text-right border-b border-border shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] ${
                                                                                // ST-1169 Fase 4.0 · Diego 2026-09-09 · background OPACO
                                                                                // (no la variante /5 con opacity) para que los botones
                                                                                // "Accept ACK / Keep PO" no dejen ver el texto de la
                                                                                // Ack Ship Date column detrás cuando el user scrollea.
                                                                                // Decisión intencional · el sticky flota sobre la tabla.
                                                                                li.matched ? 'bg-card' : 'bg-red-50 dark:bg-red-950/60'
                                                                            }`}>
                                                                                {(() => {
                                                                                    const resolution = resolutions.get(li.line)
                                                                                    // Auto-matched line · no action needed
                                                                                    if (li.matched) return <MatchedPill matched={true} />
                                                                                    // User resolved · show decision + undo
                                                                                    if (resolution) {
                                                                                        const label = resolution === 'accept-ack' ? 'Accepted ACK' : 'Kept PO'
                                                                                        const tone = resolution === 'accept-ack' ? 'bg-info/15 text-info border-info/30' : 'bg-foreground/10 text-foreground border-foreground/20'
                                                                                        return (
                                                                                            <div className="flex flex-col items-end gap-1.5">
                                                                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded border ${tone}`}>
                                                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                                                    {label}
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => setResolutions(prev => { const n = new Map(prev); n.delete(li.line); return n })}
                                                                                                    title="Undo · revert this decision"
                                                                                                    className="text-[10px] font-medium px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                                                >
                                                                                                    ↺ Undo
                                                                                                </button>
                                                                                            </div>
                                                                                        )
                                                                                    }
                                                                                    // Pending · show 2 CTAs
                                                                                    return (
                                                                                        <div className="flex flex-col items-end gap-1.5">
                                                                                            <MatchedPill matched={false} />
                                                                                            <div className="flex gap-1">
                                                                                                <button
                                                                                                    onClick={() => setResolutions(prev => new Map(prev).set(li.line, 'accept-ack'))}
                                                                                                    title="Accept vendor value (use ACK)"
                                                                                                    className="text-[10px] font-bold px-2 py-1 rounded bg-info/15 text-info hover:bg-info/25 transition-colors border border-info/30"
                                                                                                >
                                                                                                    Accept ACK
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setResolutions(prev => new Map(prev).set(li.line, 'keep-po'))}
                                                                                                    title="Reject vendor · keep PO value"
                                                                                                    className="text-[10px] font-bold px-2 py-1 rounded bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors border border-foreground/20"
                                                                                                >
                                                                                                    Keep PO
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })()}
                                                                            </td>
                                                                        </tr>,
                                                                        <tr key={`${li.line}-ack`} className={`${rowBg} align-middle border-b border-border`}>
                                                                            <td className="px-3 py-2">
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/15 text-info uppercase tracking-wider">ACK</span>
                                                                            </td>
                                                                            <td className={`px-3 py-2 text-sm font-mono text-right ${qtyDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{li.ack_quantity}</td>
                                                                            <td className="px-3 py-2 text-sm font-mono font-semibold text-info">{li.product_number}</td>
                                                                            <td className="px-3 py-2 text-sm text-info max-w-[140px] truncate" title={li.description}>{li.description}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right ${costDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{fmt(ackListNum)}</td>
                                                                            <td className="px-3 py-2 text-sm font-mono tabular-nums text-right text-info">{DISCOUNT_PCT}.00</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right ${costDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{li.ack_unit_price}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono tabular-nums text-right ${totalDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{fmt(ackTotalNum)}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono ${shipDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{REQUIRED_SHIP}</td>
                                                                            <td className={`px-3 py-2 text-sm font-mono ${shipDiff ? `${diffCellBg} text-red-700 dark:text-red-300 font-bold` : 'text-info'}`}>{ackShipDate}</td>
                                                                        </tr>,
                                                                    ]
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    </div>
                                                )
                                            })()
                                        )}
                                    </div>

                                    {/* Footer — decision row.
                                        ST-1169 · Diego 2026-09-09 · las 3
                                        acciones grandes (Accept/Review/Reject
                                        globales) se colapsaron en 1 sola CTA
                                        de commit + 1 assign secundario. Las
                                        decisiones ahora se toman por línea
                                        (Accept ACK / Keep PO inline en la
                                        Status column de Line Items) · el
                                        footer solo commits el batch resuelto. */}
                                    <div className="border-t border-border px-4 py-3 bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground">Routing:</span>
                                            <span className="font-bold text-foreground">{routingLabel(report.routing)}</span>
                                            <span className="text-muted-foreground hidden sm:inline">·</span>
                                            <span className="text-muted-foreground hidden sm:inline">{report.routing.confidence_score}% confidence</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* ST-1169 · Diego 2026-09-09 · Download report ·
                                                siempre disponible per video CORE (users lo usan
                                                para cross-check en otros sistemas). Tooltip
                                                menciona discrepancias cuando aplica. */}
                                            <button
                                                onClick={() => {
                                                    const pendingDiffs = (report.validated_line_items ?? []).filter(li => !li.matched).length
                                                    const content = [
                                                        `# Comparison Report`,
                                                        `PO: ${report.po_number}`,
                                                        `ACK: ${report.ack_id}`,
                                                        `Vendor: ${report.vendor}`,
                                                        `Status: ${report.derived_status}`,
                                                        `Line items: ${report.validated_line_items?.length ?? 0}`,
                                                        `Discrepancies: ${pendingDiffs}`,
                                                        ``,
                                                        `(Simulated export · Fase 3 wires real PDF gen)`,
                                                    ].join('\n')
                                                    const a = document.createElement('a')
                                                    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
                                                    a.download = `${report.po_number}_vs_${report.ack_id}.txt`
                                                    a.click()
                                                }}
                                                title={(() => {
                                                    const diffs = (report.validated_line_items ?? []).filter(li => !li.matched).length
                                                    return diffs > 0
                                                        ? `Download comparison report · has ${diffs} discrepancies unresolved`
                                                        : 'Download comparison report'
                                                })()}
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </button>
                                            <button
                                                onClick={() => setShowAssignReviewer(true)}
                                                title="Assign this report to a teammate for a second look"
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                                <MessageSquareWarning className="h-4 w-4" />
                                                Assign reviewer
                                            </button>
                                            <button
                                                onClick={() => onDecision?.('ACCEPT')}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Confirm decisions
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>

            <AssignReviewerModal
                isOpen={showAssignReviewer}
                onClose={() => setShowAssignReviewer(false)}
                report={report}
                onAssign={member => {
                    setShowAssignReviewer(false)
                    onDecision?.('REQUEST_REVIEW', member)
                }}
            />

            <PdfPreviewModal
                isOpen={previewDoc !== null}
                onClose={() => setPreviewDoc(null)}
                doc={previewDoc}
            />
        </Transition>
    )
}
