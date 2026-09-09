// My Feedback Status page · portada del FeedbackBoard de expert-hub y
// recortada al rol usuario. Solo accesible desde el 2º item del dropdown de
// feedback en el navbar (Diego ask 2026-07-08). NO figura como tab en la
// navbar principal.
//
// Recortes vs expert-hub · lista filtrada a `submittedBy === user.email`,
// 3 tabs simples (All / Open / Resolved), sin columnas de Assigned To /
// Submitted By / Jira, sin acciones de management del experto.

// SOURCE: quote-converter/src/pages/FeedbackStatusPage.tsx · lift S4.a
// Adaptations: import paths remapped to prod-imports/deps/quote-converter/*
// para feedback module + reuse de shared deps (Breadcrumbs · AuthToast) del
// deps/ root · AuthContext apunta a la demo's context.
import { useMemo, useState } from 'react'
import { MessageSquarePlus, Search, Inbox, Eye, Paperclip } from 'lucide-react'
import Navbar from './deps/quote-converter/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'
import FeedbackComposerModal, { type FeedbackSubmission } from './deps/quote-converter/feedback/FeedbackComposerModal'
import UserFeedbackDetailModal from './deps/quote-converter/feedback/UserFeedbackDetailModal'
import { ToastContainer, useToast } from './deps/AuthToast'
import { useAuth } from '../../context/AuthContext'
import { bucketForTab, type Category, type FeedbackItem, type FeedbackState, type FeedbackTab, type Severity } from './deps/quote-converter/feedback/types'
import { useUserFeedbacks } from './deps/quote-converter/feedback/useUserFeedbacks'

interface FeedbackStatusPageProps {
    onLogout: () => void
    onNavigate: (page: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════
   Chip helpers · classes DS-aligned para cada state / severity / category.
   ═══════════════════════════════════════════════════════════════════════ */

// Chips usan tokens semánticos del DS Strata (status-info / status-warning /
// status-success) · anti-pattern documentado prohibe raw color classes
// como text-green-600 · usar text-status-success en su lugar.
const STATE_CHIP: Record<FeedbackState, string> = {
    Submitted:  'bg-status-info/10 text-status-info',
    Triaged:    'bg-status-warning/10 text-status-warning',
    Assigned:   'bg-primary/15 text-foreground',
    Resolved:   'bg-status-success/10 text-status-success',
    Closed:     'bg-muted text-muted-foreground',
    Dropped:    'bg-muted text-muted-foreground',
    Duplicated: 'bg-muted text-muted-foreground',
}

const SEVERITY_CHIP: Record<Severity, string> = {
    Critical: 'bg-destructive/10 text-destructive',
    High:     'bg-destructive/10 text-destructive',
    Medium:   'bg-status-warning/10 text-status-warning',
    Low:      'bg-muted text-muted-foreground',
}

const CATEGORY_CHIP: Record<Category, string> = {
    'Bug':             'bg-destructive/10 text-destructive',
    'Feature Request': 'bg-status-info/10 text-status-info',
    'UI/UX':           'bg-primary/15 text-foreground',
    'Data':            'bg-status-warning/10 text-status-warning',
    'Performance':     'bg-status-info/10 text-status-info',
}

function Chip({ label, className }: { label: string; className: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
            {label}
        </span>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   Date formatting · "Jul 6, 2026" formato corto US
   ═══════════════════════════════════════════════════════════════════════ */

function formatDate(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return iso.slice(0, 10)
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   Página
   ═══════════════════════════════════════════════════════════════════════ */

export default function FeedbackStatusPage({ onLogout, onNavigate }: FeedbackStatusPageProps) {
    const { toasts, addToast, dismissToast } = useToast()
    const { user } = useAuth()
    const {
        feedbacks,
        getComments,
        addComment,
        markAsViewed,
        unreadIds,
        unreadCount,
    } = useUserFeedbacks()

    const [tab, setTab] = useState<FeedbackTab>('all')
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // Composer modal · reusa el mismo flow que OCRTracking · así "Send
    // feedback" del dropdown funciona igual desde esta page.
    const [composerOpen, setComposerOpen] = useState(false)
    const handleFeedbackSubmit = (s: FeedbackSubmission) => {
        try {
            const KEY = 'quote-converter.feedback.submissions'
            const raw = localStorage.getItem(KEY)
            const existing = raw ? JSON.parse(raw) : []
            existing.push({
                ...s,
                id: `FB-${Date.now().toString(36).toUpperCase()}`,
                submittedBy: (user?.email ?? '').toLowerCase(),
                state: 'Submitted' as const,
            })
            localStorage.setItem(KEY, JSON.stringify(existing))
            // Trigger un storage-event manual para que el hook rehidrate.
            window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
        } catch {}
        addToast('success', `Feedback submitted · ${s.category}${s.severity ? ` · ${s.severity}` : ''}`)
    }

    /* Counters + filtering. */
    const counts = useMemo(() => {
        const c = { all: 0, open: 0, resolved: 0 }
        for (const f of feedbacks) {
            c.all++
            if (bucketForTab(f.state, 'open')) c.open++
            if (bucketForTab(f.state, 'resolved')) c.resolved++
        }
        return c
    }, [feedbacks])

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        return feedbacks.filter(f => {
            if (!bucketForTab(f.state, tab)) return false
            if (!q) return true
            return (
                f.description.toLowerCase().includes(q) ||
                f.category.toLowerCase().includes(q) ||
                f.id.toLowerCase().includes(q)
            )
        })
    }, [feedbacks, tab, search])

    const selected: FeedbackItem | null = useMemo(() => {
        if (!selectedId) return null
        return feedbacks.find(f => f.id === selectedId) ?? null
    }, [selectedId, feedbacks])

    const handleOpen = (id: string) => {
        setSelectedId(id)
        markAsViewed(id)
    }

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            <Navbar
                onLogout={onLogout}
                activeTab="OCR"
                onNavigateToWorkspace={() => onNavigate('ocr')}
                onNavigate={onNavigate}
                onOpenFeedback={() => setComposerOpen(true)}
                leftSlot={<InlineExperienceSwitcher />}
            />

            <div className="pt-24 px-4 max-w-screen-2xl mx-auto">
                {/* TT.57.2 · Diego 2026-09-08 · breadcrumb dentro del content ·
                     parity con OCR/Comparisons de otras secciones. */}
                <div className="mb-4 px-1">
                    <Breadcrumbs items={[
                        { label: 'SIF Generator', onClick: () => onNavigate('ocr') },
                        { label: 'My feedback', active: true },
                    ]} /></div>
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
                        <h1 className="text-2xl font-bold text-foreground">My feedback</h1>
                        {unreadCount > 0 && (
                            <span
                                className={`ml-1 inline-flex h-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground ${
                                    unreadCount < 10 ? 'w-5' : 'px-2 min-w-[1.5rem]'
                                }`}
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track the tickets you've sent and see replies from the support team.
                    </p>
                </div>

                {/* Card contenedora */}
                <div className="rounded-xl border border-border bg-card">
                    {/* Toolbar · tabs + search */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                            {(['all', 'open', 'resolved'] as FeedbackTab[]).map(t => {
                                const label = t === 'all' ? 'All' : t === 'open' ? 'Open' : 'Resolved'
                                const count = counts[t]
                                const isActive = tab === t
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTab(t)}
                                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                                            isActive
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {label}
                                        <span className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                            isActive ? 'bg-muted text-foreground' : 'bg-card/70 text-muted-foreground'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="relative max-w-sm flex-1 min-w-[220px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search your feedback…"
                                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Tabla / empty state */}
                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Inbox className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                                {feedbacks.length === 0 ? 'You haven\'t sent any feedback yet' : 'No results'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                {feedbacks.length === 0
                                    ? 'Use the Send feedback button in the navbar to report an issue or suggest an improvement.'
                                    : 'Try a different tab or clear the search to see more tickets.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <th className="py-2.5 pl-4 pr-3">Description</th>
                                        <th className="px-3 py-2.5">Category</th>
                                        <th className="px-3 py-2.5">Severity</th>
                                        <th className="px-3 py-2.5">Status</th>
                                        <th className="px-3 py-2.5">Last update</th>
                                        <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map(f => {
                                        const isUnread = unreadIds.has(f.id)
                                        return (
                                            <tr
                                                key={f.id}
                                                className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${isUnread ? 'bg-primary/5' : ''}`}
                                            >
                                                <td className="py-3 pl-4 pr-3 max-w-md">
                                                    <div className="flex items-start gap-2">
                                                        {isUnread && (
                                                            <span
                                                                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-destructive"
                                                                title="New reply from the support team"
                                                                aria-label="Unread reply"
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="line-clamp-2 text-sm text-foreground">
                                                                {f.description}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <span className="font-mono">{f.id}</span>
                                                                {f.attachment && (
                                                                    <span className="inline-flex items-center gap-0.5">
                                                                        <Paperclip className="h-3 w-3" />
                                                                        1
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Chip label={f.category} className={CATEGORY_CHIP[f.category]} />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Chip label={f.severity} className={SEVERITY_CHIP[f.severity]} />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Chip label={f.state} className={STATE_CHIP[f.state]} />
                                                </td>
                                                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDate(f.updatedAt)}
                                                </td>
                                                <td className="py-3 pl-3 pr-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpen(f.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View
                                                    </button>
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

            {/* Detail modal */}
            <UserFeedbackDetailModal
                feedback={selected}
                comments={selected ? getComments(selected.id) : []}
                onClose={() => setSelectedId(null)}
                onAddComment={body => selected && addComment(selected.id, body)}
            />

            {/* Composer modal · reusa el flow existente */}
            <FeedbackComposerModal
                isOpen={composerOpen}
                onClose={() => setComposerOpen(false)}
                onSubmit={handleFeedbackSubmit}
                experience="pdf-to-sif"
                workspace="quote-converter"
            />

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
