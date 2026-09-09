// SOURCE: ack-vs-po-demo/src/OCRTracking.tsx@455a5b7 · TT.60 · S2 lift for
// strata-experiences-demo · 2026-09-08 · Diego "faltan las secciones de OCR
// tracking · visual y funcional". Adapt imports ./components/* → ./deps/*
// (mirror del pattern S1/TT.59). Navbar wire agrega leftSlot={InlineSwitcher}.
import { Fragment, useState } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'
import { ScanEye, FileText, CheckCircle2, AlertTriangle, Upload, Search, LayoutGrid, List, X, Archive, Sparkles, Loader2, MoreHorizontal, ChevronDown, Send, Trash2 } from 'lucide-react'
import Navbar from './deps/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import DocumentReviewModal from './deps/ocr/DocumentReviewModal'
import CreateRecordModal, { type RecordType } from './deps/create-record/CreateRecordModal'
import PublishedView, { type PublishResult } from './deps/create-record/states/PublishedView'
import { getPreflightForDoc } from './deps/create-record/mockPreflightData'
import { preflightHasInconsistencies } from './deps/create-record/usePreflight'
import { ToastContainer, useToast } from './deps/AuthToast'
import DeprecatedGrid from './deps/deprecated/DeprecatedGrid'
import DocumentDeprecationModal from './deps/DocumentDeprecationModal'
import { DEPRECATED_DOCS } from './deps/deprecated/mockData'
import type { DeprecatedDoc, DeprecationReason, ActiveStatus } from './deps/deprecated/types'
import OcrDocCard, { type OcrDocStatus, type OcrDocType } from './deps/ocr/OcrDocCard'
import DocTypeChip from './deps/ocr/DocTypeChip'
import UploadDocumentModal from './deps/ocr/UploadDocumentModal'
import PreflightSyncModal from './deps/ocr/PreflightSyncModal'
import { TEAM_MEMBERS, avatarGradient } from './deps/team/teamMembers'
import { openOriginalMockPdf } from './utils/viewOriginalMockPdf'
import FeedbackComposerModal, { type FeedbackContext, type FeedbackSubmission } from './deps/feedback/FeedbackComposerModal'
import { useTenant } from './deps/TenantContext'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'

interface OcrDoc {
    id: string
    name: string
    vendor: string
    type: OcrDocType
    date: string
    status: OcrDocStatus
    lineItems: number
    /** Team member id who owns this document (drives the top-right avatar). */
    assigneeId?: string
    /** Linked counterpart doc id (PO ↔ ACK pairing) for the compare flow. */
    relatedDocId?: string
    /** PO and ACK identifiers for the comparison launcher mock. */
    poNumber?: string
    ackId?: string
}

// Mock seed sized to match prod counts (All 21 · In-Progress 6 · Reconciled 15).
// Literal cards from prod screenshot 2026-06-09: ergotron, Better Source,
// AmTab, Magnuson Group, Leland Furniture. Rest is filler.
const OCR_DOCUMENTS: OcrDoc[] = [
    // ── In-Progress (6) ──
    // Order: Steelcase (CRITICAL_ISSUES) first so the most-urgent compare flow
    // appears at the top of the funnel during demo walkthroughs. Other docs follow.
    { id: 'OCR-003', name: 'PO-1027_Steelcase.pdf', vendor: 'Steelcase', type: 'Purchase Order', date: 'today', status: 'in_progress', lineItems: 4, assigneeId: 'marcus', relatedDocId: 'OCR-010', poNumber: 'PO-1027', ackId: 'ACK-7839' },
    { id: 'OCR-001', name: '330357 - 1.pdf', vendor: 'ergotron', type: 'Purchase Order', date: '21 days ago', status: 'in_progress', lineItems: 3, assigneeId: 'noah', relatedDocId: 'OCR-019', poNumber: 'PO-330357', ackId: 'ACK-330357' },
    { id: 'OCR-002', name: 'Custer - Func.pdf', vendor: 'Better Source', type: 'Quote', date: '21 days ago', status: 'in_progress', lineItems: 2, assigneeId: 'noah' },
    { id: 'OCR-006', name: 'PO-2055_AIS.pdf', vendor: 'AIS Furniture', type: 'Purchase Order', date: '3 days ago', status: 'in_progress', lineItems: 6, assigneeId: 'daniel', relatedDocId: 'OCR-015', poNumber: 'PO-2055', ackId: 'ACK-3099' },
    // filler — not from prod screenshot
    { id: 'OCR-021', name: 'PO-4501_Knoll.pdf', vendor: 'Knoll', type: 'Purchase Order', date: 'today', status: 'in_progress', lineItems: 3, assigneeId: 'sarah', relatedDocId: 'OCR-004', poNumber: 'PO-4501', ackId: 'ACK-7855' },
    { id: 'OCR-004', name: 'ACK-7855_Knoll.pdf', vendor: 'Knoll', type: 'Acknowledgment', date: 'yesterday', status: 'in_progress', lineItems: 3, assigneeId: 'sarah' },
    { id: 'OCR-005', name: 'QT-2891_HermanMiller.pdf', vendor: 'Herman Miller', type: 'Quote', date: 'today', status: 'in_progress', lineItems: 5, assigneeId: 'priya' },

    // ── Reconciled (15) ──
    { id: 'OCR-007', name: 'S-QUO017792.pdf', vendor: 'AmTab', type: 'Quote', date: '21 days ago', status: 'processed', lineItems: 5, assigneeId: 'noah' },
    { id: 'OCR-008', name: 'QT007508.pdf', vendor: 'Magnuson Group', type: 'Quote', date: '21 days ago', status: 'processed', lineItems: 2, assigneeId: 'noah' },
    { id: 'OCR-009', name: '852078cb.pdf', vendor: 'Leland Furniture', type: 'Purchase Order', date: '3 days ago', status: 'processed', lineItems: 3, assigneeId: 'me', poNumber: 'PO-852078', ackId: 'ACK-852078', relatedDocId: 'OCR-LEL-ACK' },
    // PO/ACK Reviewed · todos con poNumber + ackId derivados del filename
    // para que el botón "Compare linked documents" aparezca consistente.
    { id: 'OCR-010', name: 'ACK-7835_Knoll.pdf', vendor: 'Knoll', type: 'Acknowledgment', date: '5 days ago', status: 'processed', lineItems: 2, poNumber: 'PO-7835', ackId: 'ACK-7835', relatedDocId: 'OCR-KN-PO' },
    { id: 'OCR-011', name: 'PO-1025_Haworth.pdf', vendor: 'Haworth', type: 'Purchase Order', date: '6 days ago', status: 'processed', lineItems: 4, poNumber: 'PO-1025', ackId: 'ACK-1025', relatedDocId: 'OCR-HAW-ACK' },
    { id: 'OCR-012', name: 'ACK-7831_9to5.pdf', vendor: '9to5 Seating', type: 'Acknowledgment', date: '7 days ago', status: 'processed', lineItems: 1, poNumber: 'PO-7831', ackId: 'ACK-7831', relatedDocId: 'OCR-9TO5-PO' },
    { id: 'OCR-013', name: 'QT-5523_HON.pdf', vendor: 'HON', type: 'Quote', date: '8 days ago', status: 'processed', lineItems: 6 },
    { id: 'OCR-014', name: 'PO-2103_Allsteel.pdf', vendor: 'Allsteel', type: 'Purchase Order', date: '9 days ago', status: 'processed', lineItems: 3, poNumber: 'PO-2103', ackId: 'ACK-2103', relatedDocId: 'OCR-ALL-ACK' },
    { id: 'OCR-015', name: 'ACK-9087_KI.pdf', vendor: 'KI Furniture', type: 'Acknowledgment', date: '10 days ago', status: 'processed', lineItems: 4, poNumber: 'PO-9087', ackId: 'ACK-9087', relatedDocId: 'OCR-KI-PO' },
    { id: 'OCR-016', name: 'INV-3354_Global.pdf', vendor: 'Global Furniture', type: 'Invoice', date: '12 days ago', status: 'processed', lineItems: 5 },
    { id: 'OCR-017', name: 'QT-7741_OFS.pdf', vendor: 'OFS Brands', type: 'Quote', date: '14 days ago', status: 'processed', lineItems: 2 },
    { id: 'OCR-018', name: 'PO-4490_SitOnIt.pdf', vendor: 'SitOnIt Seating', type: 'Purchase Order', date: '15 days ago', status: 'processed', lineItems: 3, poNumber: 'PO-4490', ackId: 'ACK-4490', relatedDocId: 'OCR-SIT-ACK' },
    { id: 'OCR-019', name: 'ACK-8821_Teknion.pdf', vendor: 'Teknion', type: 'Acknowledgment', date: '17 days ago', status: 'processed', lineItems: 2, poNumber: 'PO-8821', ackId: 'ACK-8821', relatedDocId: 'OCR-TEK-PO' },
    { id: 'OCR-020', name: 'QT-1102_Kimball.pdf', vendor: 'Kimball', type: 'Quote', date: '19 days ago', status: 'processed', lineItems: 4 },
    { id: 'OCR-021', name: 'PO-6678_NationalOffice.pdf', vendor: 'National Office Furniture', type: 'Purchase Order', date: '20 days ago', status: 'processed', lineItems: 6, poNumber: 'PO-6678', ackId: 'ACK-6678', relatedDocId: 'OCR-NO-ACK' },
]

// DE1.11 · Diego 2026-09-02 · rename + consolidar columnas para paridad con
// gostrata.app premain. Prod usa 5 columnas kanban visibles (Processing · To
// Review · In Review · Ready to Sync · Completed) + Failed como tab-only.
// Consolidamos identified+capturing dentro de Processing (semántica prod ·
// "OCR scan + field extraction" agrupados) y renombramos 1:1 el resto.
const COLUMNS: { id: string; label: string; statuses: OcrDocStatus[]; icon: any; color: string; bg: string; border: string }[] = [
    { id: 'processing', label: 'Processing', statuses: ['identified', 'capturing'], icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'to_review', label: 'To Review', statuses: ['inconsistencies'], icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-500/20' },
    { id: 'in_review', label: 'In Review', statuses: ['in_progress'], icon: Loader2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
    { id: 'ready_to_sync', label: 'Ready to Sync', statuses: ['processed'], icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-500/20' },
    { id: 'completed', label: 'Completed', statuses: ['completed'], icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-500/20' },
]

interface OCRTrackingProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onConvertDocument?: (doc: { id: string; vendor: string; name: string; type: 'po' | 'ack'; tab: 'orders' | 'acknowledgments' }) => void;
}

export default function OCRTracking({ onLogout, onNavigate, onConvertDocument }: OCRTrackingProps) {
    const [showUpload, setShowUpload] = useState(false)
    const [preflightDoc, setPreflightDoc] = useState<OcrDoc | null>(null)
    const [processingDoc, setProcessingDoc] = useState<string | null>(null)
    const [createRecordDoc, setCreateRecordDoc] = useState<typeof OCR_DOCUMENTS[0] | null>(null)
    // DE1.10 · success dialog para happy path (sin review) · se muestra
    // envuelto en Dialog al final del render (ver bloque marcado DE1.10).
    const [publishedResult, setPublishedResult] = useState<{ result: PublishResult; recordType: RecordType; vendor: string } | null>(null)
    const [previewDoc, setPreviewDoc] = useState<typeof OCR_DOCUMENTS[0] | null>(null)
    const [deprecationTarget, setDeprecationTarget] = useState<typeof OCR_DOCUMENTS[0] | null>(null)
    const [documents, setDocuments] = useState(OCR_DOCUMENTS)
    const [deprecatedDocs, setDeprecatedDocs] = useState<DeprecatedDoc[]>(DEPRECATED_DOCS)
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
    // DE1.8 · Diego 2026-09-02 · date-range pills (Last 30 days / Full history)
    // para alinear con gostrata.app premain. Visual only por ahora · sin filtro
    // real sobre los mocks (el mock no tiene timestamps útiles para filtrar).
    const [dateRange, setDateRange] = useState<'last-30' | 'full'>('last-30')
    const [searchQuery, setSearchQuery] = useState('')
    // DE1.11 · Diego 2026-09-02 · tab IDs renombrados para paridad con
    // gostrata.app premain (Processing · To Review · In Review · Ready to
    // Sync · Completed · Failed). Status IDs internos del doc no cambian.
    const [activeTab, setActiveTab] = useState<'all' | 'processing' | 'to_review' | 'in_review' | 'ready_to_sync' | 'completed' | 'failed'>('all')
    const [feedbackContext, setFeedbackContext] = useState<FeedbackContext | null>(null)
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
    // DE1.18 · Diego 2026-09-02 · compareDoc state removido junto con el
    // botón "Compare linked documents" y el ComparisonLauncher montado.
    // El flow de comparación vive en /comparisons ahora.
    const { toasts, addToast, dismissToast } = useToast()
    const { selectedTenants } = useTenant()

    const handleSendFeedback = (doc: { id: string; vendor: string; type: string; status: string }) => {
        setFeedbackContext({ docId: doc.id, vendor: doc.vendor, docType: doc.type, status: doc.status })
    }

    const toggleDocSelect = (docId: string) => {
        setSelectedDocIds(prev => {
            const next = new Set(prev)
            if (next.has(docId)) next.delete(docId); else next.add(docId)
            return next
        })
    }

    const handleBatchFeedback = () => {
        if (selectedDocIds.size === 0) return
        setFeedbackContext({ batchDocIds: Array.from(selectedDocIds) })
    }

    const clearSelection = () => setSelectedDocIds(new Set())

    const handleFeedbackSubmit = (s: FeedbackSubmission) => {
        try {
            const KEY = 'expert-hub.feedback.submissions'
            const raw = localStorage.getItem(KEY)
            const existing = raw ? JSON.parse(raw) : []
            existing.push({ ...s, id: `FB-${Date.now().toString(36).toUpperCase()}` })
            localStorage.setItem(KEY, JSON.stringify(existing))
        } catch {}
        addToast('success', `Feedback submitted · ${s.category}${s.severity ? ` · ${s.severity}` : ''}`)
    }

    // DE1.12 · Diego 2026-09-02 · handleMarkCompleted removido junto con el
    // botón "Mark as Completed" (no existe en gostrata.app premain).

    const handlePreflightSync = (doc: OcrDoc) => {
        setPreflightDoc(doc)
    }

    const recordTypeFromDoc = (doc: OcrDoc): RecordType =>
        doc.type === 'Acknowledgment' ? 'ACK' : 'PO'

    // DE1.10 · Diego 2026-09-02 · en el happy path (sin inconsistencies)
    // se mostraba solo un toast · ahora abre el dialog PublishedView
    // (Acknowledgement created / Purchase order created) con las 4
    // StatCards para paridad con gostrata.app premain.
    const handleCreateRecord = (doc: OcrDoc) => {
        const preflight = getPreflightForDoc(doc as unknown as Parameters<typeof getPreflightForDoc>[0])
        if (preflightHasInconsistencies(preflight)) {
            setCreateRecordDoc(doc)
            return
        }
        const recordType = recordTypeFromDoc(doc)
        const totalFields = preflight.sections.reduce((sum, s) => sum + s.fields.length, 0)
        const includedExtras = preflight.extras.filter(x => x.included).length
        const recordId = `${recordType === 'PO' ? 'PO' : 'ACK'}-${Math.floor(Math.random() * 9000) + 1000}`
        setPublishedResult({
            result: {
                recordId,
                fieldsSaved: totalFields + includedExtras,
                fieldsDropped: 0,
                lineCount: preflight.lineItems.length,
                environment: preflight.environment,
            },
            recordType,
            vendor: doc.vendor,
        })
    }

    const openDeprecation = (doc: OcrDoc) => {
        setDeprecationTarget(doc)
    }

    const handleConfirmDeprecation = (payload: {
        docId: string
        reason: DeprecationReason
        customReason?: string
        replacementId?: string
    }) => {
        const original = documents.find(d => d.id === payload.docId)
        if (!original) return

        const archived: DeprecatedDoc = {
            id: original.id,
            name: original.name,
            vendor: original.vendor,
            type: original.type,
            pages: 0,
            fields: 0,
            date: original.date,
            status: 'deprecated',
            confidence: null,
            inconsistencyCount: 0,
            deprecationReason: payload.reason,
            deprecationCustomReason: payload.customReason,
            replacementId: payload.replacementId,
            deprecatedAt: new Date().toISOString().slice(0, 10),
            deprecatedBy: 'demo.user@example.com',
            originalStatus: original.status as ActiveStatus,
        }

        setDocuments(prev => prev.filter(d => d.id !== payload.docId))
        setDeprecatedDocs(prev => [archived, ...prev])
        setDeprecationTarget(null)
        setPreviewDoc(null)

        const reasonUpper = payload.reason === 'manually_archived' ? 'MANUALLY ARCHIVED'
            : payload.reason === 'duplicate' ? 'DUPLICATED'
            : 'OTHER'
        addToast('success', `Document deprecated: ${reasonUpper}`, {
            label: 'Undo',
            onClick: () => {
                setDeprecatedDocs(prev => prev.filter(d => d.id !== original.id))
                setDocuments(prev => [original, ...prev])
            },
        })
    }

    const handlePreviewDeprecated = (doc: DeprecatedDoc) => {
        setPreviewDoc({
            id: doc.id,
            name: doc.name,
            vendor: doc.vendor,
            type: doc.type as OcrDocType,
            date: doc.date ?? doc.deprecatedAt,
            status: 'deprecated',
            lineItems: 0,
        })
    }

    const filteredDocs = documents.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.vendor.toLowerCase().includes(searchQuery.toLowerCase())
        // DE1.11 · tabs consumen la union de `statuses` de COLUMNS (ej.
        // Processing = identified + capturing) para paridad con prod.
        const tabDef = COLUMNS.find(c => c.id === activeTab)
        const matchesTab = activeTab === 'all' || (!!tabDef && tabDef.statuses.includes(d.status))
        return matchesSearch && matchesTab
    })

    const counts = {
        all: documents.length,
        processing: documents.filter(d => d.status === 'identified' || d.status === 'capturing').length,
        to_review: documents.filter(d => d.status === 'inconsistencies').length,
        in_review: documents.filter(d => d.status === 'in_progress').length,
        ready_to_sync: documents.filter(d => d.status === 'processed').length,
        completed: documents.filter(d => d.status === 'completed').length,
        failed: deprecatedDocs.length,
    }

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">

            <Navbar onLogout={onLogout} activeTab="OCR" onNavigateToWorkspace={() => onNavigate('ocr-tracking')} onNavigate={onNavigate} leftSlot={<InlineExperienceSwitcher />} />

            {/* DE1.7 · Diego 2026-09-02 · breadcrumb movido DEBAJO del navbar,
                dentro del content area (alineado con gostrata.app premain).
                Antes estaba `fixed top-2 left-6 z-50` (encima del navbar). */}
            <div className="pt-24 px-4 max-w-screen-2xl mx-auto">
                <div className="text-xs">
                    <Breadcrumbs items={[
                        { label: 'Expert Hub', onClick: () => onNavigate('ocr-tracking') },
                        { label: 'OCR Tracking', active: true }
                    ]} />
                </div>
            </div>

            {/* Main Content — wider container to fit 8 tabs without horizontal scroll */}
            <div className="pt-4 px-4 max-w-screen-2xl mx-auto space-y-6">

                {/* Processing Indicator */}
                {processingDoc && (
                    <div className="bg-ai-light dark:bg-ai/10 border border-ai/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-ai flex items-center justify-center"><ScanEye className="h-4 w-4 text-white animate-spin" /></div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Processing document...</p>
                            <p className="text-xs text-muted-foreground">OCR extraction in progress — extracting fields and validating data</p>
                        </div>
                    </div>
                )}

                {/* ═══ Main Card Container — SAME as Transactions ═══ */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

                    {/* Header inside card — title + tabs + search + actions */}
                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col gap-6">
                            {/* Top Row: Title + Tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* DE1.13 · Diego 2026-09-02 · section title alineado con
                                    gostrata.app premain · el H1 del card dice "Expert Hub"
                                    (no "OCR Tracking"). El breadcrumb superior sí conserva
                                    "Expert Hub > OCR Tracking" como en prod. */}
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
                                    Expert Hub
                                </h3>
                                {/* DE1.11 · Diego 2026-09-02 · tabs paridad gostrata.app premain ·
                                    7 tabs sin divider · Failed antes se llamaba Deprecated y
                                    Ingesting+Needs Attention fueron consolidados en Processing. */}
                                <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                                    {[
                                        { id: 'all', label: 'All', count: counts.all, hint: 'All documents currently in the OCR pipeline' },
                                        { id: 'processing', label: 'Processing', count: counts.processing, hint: 'Newly uploaded documents · OCR scan + field extraction in progress' },
                                        { id: 'to_review', label: 'To Review', count: counts.to_review, hint: 'Inconsistencies detected — needs Expert Hub resolution' },
                                        { id: 'in_review', label: 'In Review', count: counts.in_review, hint: 'An Expert Hub member is actively resolving inconsistencies on these documents' },
                                        { id: 'ready_to_sync', label: 'Ready to Sync', count: counts.ready_to_sync, hint: 'Reviewed by an expert · linked documents matched and ready to create as Orderbahn records' },
                                        { id: 'completed', label: 'Completed', count: counts.completed, hint: 'Documents fully processed and turned into Orderbahn records' },
                                        { id: 'failed', label: 'Failed', count: counts.failed, hint: 'Archived documents · no longer in the active pipeline (superseded, cancelled, duplicates, errors)' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            title={tab.hint}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 outline-none whitespace-nowrap ${
                                                activeTab === tab.id
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-brand-300 dark:hover:bg-brand-600/50 hover:text-foreground'
                                            }`}
                                        >
                                            {tab.label}
                                            <span title={`${tab.count} document${tab.count === 1 ? '' : 's'} in this stage`} className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                                                activeTab === tab.id ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-background text-muted-foreground'
                                            }`}>{tab.count}</span>
                                        </button>
                                    ))}
                                    {/* Visual divider — separates active funnel from archive */}
                                    <span aria-hidden="true" className="self-center w-px h-5 bg-border mx-1.5" />
                                    <button
                                        onClick={() => setActiveTab('deprecated')}
                                        title="Archived documents — no longer in the active pipeline (superseded, cancelled, duplicates, etc.)"
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 outline-none whitespace-nowrap ${
                                            activeTab === 'failed'
                                                ? 'bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm'
                                                : 'text-muted-foreground hover:bg-zinc-300/40 dark:hover:bg-zinc-700/40 hover:text-foreground'
                                        }`}
                                    >
                                        Deprecated
                                        <span title={`${counts.deprecated} archived document${counts.deprecated === 1 ? '' : 's'}`} className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                                            activeTab === 'failed' ? 'bg-white/15 dark:bg-zinc-900/15 text-white dark:text-zinc-900' : 'bg-background text-muted-foreground'
                                        }`}>{counts.deprecated}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Row: Search · Filter · Avatar group · spacer · View toggle · Upload */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="relative flex-1 max-w-sm min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search documents..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        title="Search by document name or vendor"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                                    />
                                </div>

                                {/* Filter dropdown (placeholder — matches prod "All" pill) */}
                                <button
                                    title="Filter documents (placeholder)"
                                    className="flex items-center gap-2 px-3 py-2 text-sm bg-background border border-input rounded-lg text-foreground hover:bg-muted transition-colors min-w-[110px]"
                                >
                                    <span className="text-muted-foreground">All</span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                                </button>

                                {/* Avatar group — team members with access (CC CM DP DZ JV JV +6 style) */}
                                <div className="flex items-center -space-x-2">
                                    {TEAM_MEMBERS.slice(0, 6).map(m => (
                                        <div
                                            key={m.id}
                                            title={`${m.name} · ${m.role}`}
                                            className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatarGradient(m.id)} ring-2 ring-card flex items-center justify-center text-white text-[10px] font-bold`}
                                        >
                                            {m.initials}
                                        </div>
                                    ))}
                                    {TEAM_MEMBERS.length > 6 && (
                                        <div
                                            title={`${TEAM_MEMBERS.length - 6} more team members`}
                                            className="h-8 w-8 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-foreground text-[10px] font-bold"
                                        >
                                            +{TEAM_MEMBERS.length - 6}
                                        </div>
                                    )}
                                </div>

                                {/* DE1.8 · date-range pills · matches gostrata.app premain */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setDateRange('last-30')}
                                        title="Show last 30 days"
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                            dateRange === 'last-30'
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-background border border-input text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        Last 30 days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateRange('full')}
                                        title="Show full history"
                                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                            dateRange === 'full'
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-background border border-input text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        Full history
                                    </button>
                                </div>

                                <div className="ml-auto flex items-center gap-2">
                                    {/* View toggle */}
                                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                                        <button onClick={() => setViewMode('list')} title="List view" aria-label="List view" className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                            <List className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setViewMode('kanban')} title="Board view" aria-label="Board view" className={`p-2 transition-colors ${viewMode === 'kanban' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                            <LayoutGrid className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* DE1.17 · Diego 2026-09-02 · chip "Live updates paused"
                                        removido (Diego pidió quitarlo · antes DE1.10/11 lo
                                        habíamos agregado y refinado para paridad prod). */}

                                    {/* Upload Document — prominent lime brand button */}
                                    <button
                                        onClick={() => setShowUpload(true)}
                                        title="Upload a new document"
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload Document
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content area inside the card */}
                    <div className="p-6">
                        {/* Deprecated archive — replaces kanban/list when active */}
                        {activeTab === 'failed' && (
                            <DeprecatedGrid
                                docs={deprecatedDocs}
                                onPreview={handlePreviewDeprecated}
                                onRestore={(d) => {
                                    setDeprecatedDocs(prev => prev.filter(x => x.id !== d.id))
                                    setDocuments(prev => [{
                                        id: d.id,
                                        name: d.name,
                                        vendor: d.vendor,
                                        type: d.type as OcrDocType,
                                        date: d.date ?? d.deprecatedAt,
                                        status: (d.originalStatus ?? 'in_progress') as OcrDocStatus,
                                        lineItems: 0,
                                        assigneeId: 'me',
                                    }, ...prev])
                                    addToast('success', `Restored ${d.id} · ${d.vendor}`)
                                }}
                                onDownloadOriginal={(d) => {
                                    openOriginalMockPdf({ id: d.id, name: d.name, vendor: d.vendor || 'Unknown Vendor', type: d.type })
                                        .catch(() => addToast('error', `Could not open original PDF · ${d.name}`))
                                }}
                            />
                        )}

                        {/* Kanban View — flex horizontal scroll, fixed-width columns to match prod card width */}
                        {activeTab !== 'failed' && viewMode === 'kanban' && (
                            <div className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2">
                                {COLUMNS.map(column => {
                                    // DE1.11 · usa el array `statuses` de la columna (ej.
                                    // Processing = identified + capturing) para paridad prod.
                                    const docs = filteredDocs.filter(d => column.statuses.includes(d.status))
                                    return (
                                        <div key={column.id} className="space-y-3 min-w-[300px] flex-shrink-0">
                                            {/* Column Header */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-sm font-semibold ${column.color}`}>{column.label}</span>
                                                <span className="text-xs font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{docs.length}</span>
                                                <button className="ml-auto p-1 text-muted-foreground hover:text-foreground" title="Column options"><MoreHorizontal className="h-4 w-4" /></button>
                                            </div>
                                            {/* Cards */}
                                            <div className="space-y-3">
                                                {docs.map(doc => (
                                                    <OcrDocCard
                                                        key={doc.id}
                                                        doc={doc}
                                                        onPreview={() => setPreviewDoc(doc)}
                                                        onPreflightSync={() => handlePreflightSync(doc)}
                                                        onDeprecate={() => openDeprecation(doc)}
                                                        selected={selectedDocIds.has(doc.id)}
                                                        onToggleSelect={() => toggleDocSelect(doc.id)}
                                                    />
                                                ))}
                                                {docs.length === 0 && (
                                                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                                                        <p className="text-xs text-muted-foreground">No documents</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* List View — matches prod: Document hash + line items / Vendor + type pill / Status / Review Status / Date / Actions */}
                        {activeTab !== 'failed' && viewMode === 'list' && (
                            <div className="overflow-hidden rounded-xl border border-border">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Document</th>
                                            <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Vendor</th>
                                            <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                                            <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Review Status</th>
                                            <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                                            <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDocs.map(doc => {
                                            const isReconciledLike = doc.status === 'processed' || doc.status === 'completed'
                                            const isProcessing = doc.status === 'identified' || doc.status === 'capturing'
                                            const assignee = doc.assigneeId ? TEAM_MEMBERS.find(m => m.id === doc.assigneeId) : null
                                            return (
                                                <tr key={doc.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            <div>
                                                                <div className="text-sm font-bold text-foreground font-mono">{doc.id}</div>
                                                                <div className="text-[11px] text-muted-foreground">{doc.lineItems > 0 ? `${doc.lineItems} line items` : '—'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-bold text-foreground">{doc.vendor}</div>
                                                        <div className="mt-1">
                                                            <DocTypeChip type={doc.type} size="sm" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                                                            isReconciledLike ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' :
                                                            doc.status === 'in_progress' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' :
                                                            doc.status === 'inconsistencies' ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' :
                                                            isProcessing ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200' :
                                                            'bg-muted text-muted-foreground'
                                                        }`}>
                                                            {isReconciledLike ? 'Reviewed' :
                                                             doc.status === 'in_progress' ? 'In Progress' :
                                                             doc.status === 'inconsistencies' ? 'Awaiting Expert' :
                                                             isProcessing ? 'Processing' : doc.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isReconciledLike ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                                                                <CheckCircle2 className="h-3 w-3" /> Reviewed
                                                            </span>
                                                        ) : isProcessing ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
                                                                <Loader2 className="h-3 w-3 animate-spin" /> Calculating…
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                                                                <AlertTriangle className="h-3 w-3" /> Pending For Review
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">{doc.date}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setPreviewDoc(doc)}
                                                                className="p-1.5 rounded-md text-foreground hover:bg-muted transition-colors"
                                                                title="Review Fields"
                                                                aria-label="Review document fields"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </button>
                                                            {/* DE1.12 · Mark as Completed removido (kanban + list).
                                                                DE1.14/15 · Preflight Sync visible en in_progress
                                                                (disabled + tooltip "Awaiting full review") y en
                                                                processed (funcional verde). Match gostrata.app premain. */}
                                                            {doc.status === 'in_progress' && (
                                                                <span
                                                                    title="Awaiting full review"
                                                                    aria-label="Preflight Sync (disabled — awaiting full review)"
                                                                    className="p-1.5 rounded-md text-green-400 bg-green-50/60 dark:text-green-500 dark:bg-green-500/10 inline-flex cursor-not-allowed opacity-70"
                                                                >
                                                                    <Send className="h-4 w-4" />
                                                                </span>
                                                            )}
                                                            {doc.status === 'processed' && (
                                                                <button
                                                                    onClick={() => handlePreflightSync(doc)}
                                                                    className="p-1.5 rounded-md text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-500/15 hover:brightness-95 transition-all"
                                                                    title="Preflight Sync"
                                                                    aria-label="Preflight Sync"
                                                                >
                                                                    <Send className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openDeprecation(doc)}
                                                                className="p-1.5 rounded-md text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/15 hover:brightness-95 transition-all"
                                                                title="Deprecate"
                                                                aria-label="Deprecate document"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                            {assignee && (
                                                                <div
                                                                    title={assignee.name}
                                                                    className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(assignee.id)} flex items-center justify-center text-white text-[10px] font-bold ml-1`}
                                                                >
                                                                    {assignee.initials}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FB-06b · Floating multi-select action bar · aparece cuando hay docs seleccionados */}
            {selectedDocIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                            {selectedDocIds.size}
                        </span>
                        <span className="font-medium text-foreground">document{selectedDocIds.size === 1 ? '' : 's'} selected</span>
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <button
                        onClick={handleBatchFeedback}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Send feedback for {selectedDocIds.size}
                    </button>
                    <button
                        onClick={clearSelection}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Document Review Modal — full prod-style modal with Header Fields + Line Items tabs */}
            <DocumentReviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                doc={previewDoc}
                onSave={(d) => {
                    addToast('success', `Document saved · ${d.vendor}`)
                }}
                onSendFeedback={(d) => handleSendFeedback({ id: d.id, vendor: d.vendor, type: d.type, status: d.status })}
                onDownloadOriginal={(d) => {
                    openOriginalMockPdf(d).catch(() => {
                        addToast('error', `Could not open original PDF · ${d.name}`)
                    })
                }}
            />

            <FeedbackComposerModal
                isOpen={!!feedbackContext}
                onClose={() => setFeedbackContext(null)}
                onSubmit={handleFeedbackSubmit}
                experienceLabel="expert-hub · OCR Tracking"
                workspaceLabel={selectedTenants[0] ?? 'SPECIAL T'}
                context={feedbackContext ?? undefined}
            />

            {/* Mark-as-Deprecated reason picker */}
            <DocumentDeprecationModal
                isOpen={!!deprecationTarget}
                onClose={() => setDeprecationTarget(null)}
                document={deprecationTarget ? {
                    id: deprecationTarget.id,
                    name: deprecationTarget.name,
                    vendor: deprecationTarget.vendor,
                    type: deprecationTarget.type,
                    status: deprecationTarget.status as ActiveStatus,
                } : null}
                candidates={documents.map(d => ({
                    id: d.id,
                    vendor: d.vendor,
                    name: d.name,
                    type: d.type,
                    date: d.date,
                }))}
                onConfirm={handleConfirmDeprecation}
            />

            {/* Create Record Modal (Fase 1: stub shell) */}
            <CreateRecordModal
                isOpen={!!createRecordDoc}
                onClose={() => setCreateRecordDoc(null)}
                document={createRecordDoc}
                recordType={createRecordDoc ? recordTypeFromDoc(createRecordDoc) : 'PO'}
                onCreated={(recordId) => {
                    const doc = createRecordDoc
                    setCreateRecordDoc(null)
                    if (doc) addToast('success', `Record ${recordId} created · ${doc.vendor}`)
                }}
            />

            {/* DE1.10 · Diego 2026-09-02 · Success dialog standalone para el
                happy path (sin inconsistencies). Reusa PublishedView del
                CreateRecordModal envuelto en un Dialog dedicado · evita el
                review flow completo cuando el preflight no tiene issues. */}
            <Transition show={!!publishedResult} as={Fragment}>
                <Dialog as="div" className="relative z-[200]" onClose={() => setPublishedResult(null)}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-md" />
                    </TransitionChild>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-6">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-260" enterFrom="opacity-0 translate-y-2 scale-[0.995]" enterTo="opacity-100 translate-y-0 scale-100"
                                leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.995]"
                            >
                                <DialogPanel className="relative w-full max-w-[1120px] h-[760px] rounded-3xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col">
                                    {publishedResult && (
                                        <PublishedView
                                            result={publishedResult.result}
                                            recordType={publishedResult.recordType}
                                            vendor={publishedResult.vendor}
                                            onClose={() => setPublishedResult(null)}
                                            onViewRecord={() => {
                                                addToast('success', `Record ${publishedResult.result.recordId} created · ${publishedResult.vendor}`)
                                                setPublishedResult(null)
                                            }}
                                        />
                                    )}
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* DE1.18 · Diego 2026-09-02 · ComparisonLauncher removido de OCR ·
                el flow de comparación ahora vive únicamente en /comparisons. */}

            {/* Preflight Sync Modal — opens via airplane icon on Reviewed docs */}
            <PreflightSyncModal
                isOpen={!!preflightDoc}
                onClose={() => setPreflightDoc(null)}
                doc={preflightDoc}
                onCreateRecord={(d) => {
                    handleCreateRecord(d)
                    addToast('success', `Record created · ${d.vendor}`)
                }}
                onDownloadOriginal={(d) => {
                    openOriginalMockPdf(d).catch(() => addToast('error', `Could not open original PDF · ${d.name}`))
                }}
            />

            {/* Upload Document Modal — 5-step flow: select → dropzone → review → uploading → complete */}
            <UploadDocumentModal
                isOpen={showUpload}
                onClose={() => setShowUpload(false)}
                onConfirm={(docType, uploadedFiles) => {
                    if (uploadedFiles.length === 0) return
                    // Each uploaded file becomes a new doc. Pipeline simulation:
                    // identified (Processing) → in_progress (after 3s) → ready for review.
                    const newDocs: OcrDoc[] = uploadedFiles.map(f => ({
                        id: Math.random().toString(36).slice(2, 10),
                        name: f.name,
                        vendor: 'Unknown Vendor',
                        type: docType,
                        date: 'today',
                        status: 'identified' as const,
                        lineItems: Math.floor(Math.random() * 5) + 1,
                        assigneeId: 'me',
                    }))
                    const newIds = newDocs.map(d => d.id)
                    setDocuments(prev => [...newDocs, ...prev])
                    setProcessingDoc(newDocs[0].id)
                    addToast('success', `Processing new file${newDocs.length === 1 ? '' : 's'}…`)
                    setTimeout(() => {
                        setDocuments(prev => prev.map(d =>
                            newIds.includes(d.id) ? { ...d, status: 'in_progress' as const, vendor: 'New Vendor Co.' } : d
                        ))
                        setProcessingDoc(null)
                        addToast('info', `${newIds.length} document${newIds.length === 1 ? '' : 's'} ready for review`)
                    }, 3000)
                }}
            />

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
