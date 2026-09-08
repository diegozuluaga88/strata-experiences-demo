// SOURCE: expert-hub/src/Comparisons.tsx@f59da74
// Lift for strata-experiences-demo · S1 · 2026-09-08
// Adaptations: import paths remapped from ./components/* to ./deps/* (mirrors
// prod-imports lift discipline). No functional changes.
import { useState, useMemo } from 'react'
import { Search, List, LayoutGrid, FileText, GitCompare, CheckCircle2, AlertTriangle, FileSearch } from 'lucide-react'
import Navbar from './deps/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import DocTypeChip from './deps/ocr/DocTypeChip'
import { avatarGradient } from './deps/team/teamMembers'
import { ToastContainer, useToast } from './deps/AuthToast'
import ComparisonLauncher from './deps/comparison/ComparisonLauncher'
import AckReconciliationModal from './deps/AckReconciliationModal'
import ResolveInconsistencyModal from './deps/ResolveDiscrepancyModal'

interface ComparisonsProps {
    onLogout: () => void
    onNavigate: (page: string) => void
}

type CompareStatus = 'Pending' | 'Reviewed' | 'Discrepancy' | 'Completed'

interface ComparisonDoc {
    /** Acknowledgment id (matches the mock comparison keys, e.g. "ACK-8840"). */
    id: string
    vendor: string
    relatedPo: string
    status: CompareStatus
    reviewStatus: 'Reviewed' | 'Pending For Review'
    date: string
    initials: string
    lineItems: number
}

// Each row is an Acknowledgment paired with the Purchase Order it confirms.
// The PO::ACK pairs map to real reports in mockComparisonData (getMockComparisonReport).
const COMPARISON_DOCS: ComparisonDoc[] = [
    { id: 'ACK-8840', vendor: 'Steelcase', relatedPo: 'PO-2026-002', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'Jan 13, 2026', initials: 'SC', lineItems: 50 },
    { id: 'ACK-8841', vendor: 'Knoll', relatedPo: 'PO-2026-003', status: 'Pending', reviewStatus: 'Pending For Review', date: 'Jan 12, 2026', initials: 'KN', lineItems: 12 },
    { id: 'ACK-8842', vendor: 'AIS Furniture', relatedPo: 'PO-2026-004', status: 'Pending', reviewStatus: 'Pending For Review', date: 'Jan 15, 2026', initials: 'AI', lineItems: 6 },
    { id: 'ACK-8839', vendor: 'Herman Miller', relatedPo: 'PO-2026-001', status: 'Reviewed', reviewStatus: 'Reviewed', date: 'Jan 14, 2026', initials: 'HM', lineItems: 8 },
    { id: 'ACK-330357', vendor: 'ergotron', relatedPo: 'PO-330357', status: 'Reviewed', reviewStatus: 'Reviewed', date: '21 days ago', initials: 'EG', lineItems: 3 },
    { id: 'ACK-7855', vendor: 'Knoll', relatedPo: 'PO-4501', status: 'Pending', reviewStatus: 'Pending For Review', date: '5 days ago', initials: 'KN', lineItems: 3 },
    { id: 'ACK-7839', vendor: 'Steelcase', relatedPo: 'PO-1027', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'today', initials: 'SC', lineItems: 4 },
    { id: 'ACK-9001', vendor: 'OFS Brands', relatedPo: 'PO-7741', status: 'Completed', reviewStatus: 'Reviewed', date: '14 days ago', initials: 'OF', lineItems: 2 },
]

const FUNNEL: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'reviewed', label: 'Reviewed' },
    { id: 'discrepancy', label: 'Discrepancy' },
    { id: 'completed', label: 'Completed' },
]

function statusClasses(s: CompareStatus): string {
    switch (s) {
        case 'Reviewed':
        case 'Completed': return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-500/15 ring-1 ring-inset ring-green-600/20'
        case 'Discrepancy': return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-500/15 ring-1 ring-inset ring-red-600/20'
        default: return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15 ring-1 ring-inset ring-amber-600/20'
    }
}

export default function Comparisons({ onLogout, onNavigate }: ComparisonsProps) {
    const [activeTab, setActiveTab] = useState('all')
    const [query, setQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const { toasts, addToast, dismissToast } = useToast()

    const [compareDoc, setCompareDoc] = useState<ComparisonDoc | null>(null)
    const [isReconciliationOpen, setIsReconciliationOpen] = useState(false)
    const [resolveDoc, setResolveDoc] = useState<{ id: string; name: string; vendor: string; inconsistencyCount: number } | null>(null)

    const triggerToast = (title: string, description: string, type: 'success' | 'error' | 'info') =>
        addToast(type, `${title} · ${description}`)

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: COMPARISON_DOCS.length }
        for (const d of COMPARISON_DOCS) c[d.status.toLowerCase()] = (c[d.status.toLowerCase()] ?? 0) + 1
        return c
    }, [])

    const filtered = useMemo(() => COMPARISON_DOCS.filter(d => {
        const matchesTab = activeTab === 'all' || d.status.toLowerCase() === activeTab
        const q = query.trim().toLowerCase()
        const matchesSearch = !q || d.vendor.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.relatedPo.toLowerCase().includes(q)
        return matchesTab && matchesSearch
    }), [activeTab, query])

    const openCompare = (d: ComparisonDoc) => setCompareDoc(d)
    const openResolve = (d: ComparisonDoc) => setResolveDoc({ id: d.id, name: d.id, vendor: d.vendor, inconsistencyCount: 3 })

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            {/* Breadcrumb hoisted above navbar */}
            <div className="fixed top-2 left-6 z-50 text-xs opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
                <Breadcrumbs items={[
                    { label: 'Expert Hub', onClick: () => onNavigate('ocr-tracking') },
                    { label: 'Comparisons', active: true },
                ]} />
            </div>

            <Navbar onLogout={onLogout} activeTab="Comparisons" onNavigateToWorkspace={() => onNavigate('comparisons')} onNavigate={onNavigate} />

            <div className="pt-24 px-4 max-w-screen-2xl mx-auto space-y-6">
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Header: title + funnel + search + view toggle */}
                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
                                    <GitCompare className="h-5 w-5 text-primary" />
                                    Comparisons
                                </h3>
                                <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                                    {FUNNEL.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 outline-none whitespace-nowrap ${
                                                activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                                            }`}
                                        >
                                            {tab.label}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'}`}>
                                                {counts[tab.id] ?? 0}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="relative flex-1 max-w-sm min-w-[220px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search comparisons…"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                                <div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden">
                                    <button onClick={() => setViewMode('list')} title="List view" aria-label="List view" className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setViewMode('grid')} title="Grid view" aria-label="Grid view" className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <GitCompare className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No comparisons</p>
                                <p className="text-sm text-muted-foreground mt-1">Acknowledgments paired with a purchase order appear here for review.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* ── Grid (cards) ── */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {filtered.map(d => (
                                    <div key={d.id} className="group bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-foreground truncate">{d.vendor}</span>
                                                            <DocTypeChip type="Acknowledgment" size="sm" />
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground font-mono truncate">{d.id}</div>
                                                    </div>
                                                </div>
                                                <div title={d.vendor} className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(d.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                                                    {d.initials}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 mb-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Linked PO</span>
                                                    <span className="font-semibold text-foreground font-mono">{d.relatedPo}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Line Items</span>
                                                    <span className="font-semibold text-foreground">{d.lineItems} line items</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); openCompare(d) }}
                                                title="Compare this acknowledgment against its linked purchase order"
                                                className="mb-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-300/30 text-foreground border border-brand-300/50 hover:bg-brand-300/50 dark:bg-brand-500/15 dark:border-brand-500/40 dark:hover:bg-brand-500/25 px-3 py-2 text-xs font-bold transition-colors"
                                            >
                                                <GitCompare className="h-3.5 w-3.5" />
                                                Compare with PO
                                            </button>

                                            <div className="border-t border-border pt-3 flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClasses(d.status)}`}>
                                                    {d.status}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsReconciliationOpen(true) }}
                                                        title="Reconcile PO vs ACK"
                                                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <FileSearch className="h-4 w-4" />
                                                    </button>
                                                    {d.status === 'Discrepancy' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openResolve(d) }}
                                                            title="Resolve discrepancies"
                                                            className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors"
                                                        >
                                                            <AlertTriangle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* ── List (table) ── */
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30 text-left">
                                            {['Document', 'Vendor', 'Linked PO', 'Status', 'Review Status', 'Date', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(d => (
                                            <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <div>
                                                            <div className="text-sm font-bold text-foreground font-mono">{d.id}</div>
                                                            <div className="text-[11px] text-muted-foreground">{d.lineItems} line items</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold text-foreground">{d.vendor}</div>
                                                    <div className="mt-1"><DocTypeChip type="Acknowledgment" size="sm" /></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-foreground">{d.relatedPo}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(d.status)}`}>{d.status}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {d.reviewStatus === 'Reviewed' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> Reviewed</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Pending For Review</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{d.date}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => openCompare(d)}
                                                            title="Compare with PO"
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md bg-brand-300/30 text-foreground border border-brand-300/50 hover:bg-brand-300/50 dark:bg-brand-500/15 dark:border-brand-500/40 dark:hover:bg-brand-500/25 transition-colors"
                                                        >
                                                            <GitCompare className="h-3.5 w-3.5" /> Compare
                                                        </button>
                                                        <button onClick={() => setIsReconciliationOpen(true)} title="Reconcile PO vs ACK" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                            <FileSearch className="h-4 w-4" />
                                                        </button>
                                                        {d.status === 'Discrepancy' && (
                                                            <button onClick={() => openResolve(d)} title="Resolve discrepancies" className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors">
                                                                <AlertTriangle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <div title={d.vendor} className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(d.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0 ml-1`}>
                                                            {d.initials}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PO↔ACK comparison flow */}
            <ComparisonLauncher
                isOpen={!!compareDoc}
                onClose={() => setCompareDoc(null)}
                poNumber={compareDoc?.relatedPo ?? ''}
                ackId={compareDoc?.id ?? ''}
                onDecision={(report, action) => {
                    const t = action === 'REJECT' ? 'error' : action === 'REQUEST_REVIEW' ? 'info' : 'success'
                    const verb = action === 'ACCEPT' ? 'accepted' : action === 'REJECT' ? 'rejected' : 'flagged for review'
                    addToast(t, `${report.po_number} vs ${report.ack_id} ${verb} (simulated)`)
                }}
            />

            <AckReconciliationModal isOpen={isReconciliationOpen} onClose={() => setIsReconciliationOpen(false)} triggerToast={triggerToast} />
            <ResolveInconsistencyModal isOpen={!!resolveDoc} onClose={() => setResolveDoc(null)} document={resolveDoc} />

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
