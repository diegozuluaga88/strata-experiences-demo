// UserFeedbackDetailModal · portado del FeedbackDetailModal de expert-hub
// y recortado al rol usuario. Muestra metadata (read-only) + chat thread
// bidireccional donde el user (reporter) puede responder pero no ejecutar
// acciones de management del experto (assign, cambiar state, promover a
// Jira, marcar duplicado, etc.).

import { Fragment, useEffect, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Send, Paperclip } from 'lucide-react'
import type { FeedbackComment, FeedbackItem } from './types'
import { stateHelperText } from './types'
import type { Category, FeedbackState, Severity } from './types'

interface UserFeedbackDetailModalProps {
    feedback: FeedbackItem | null
    comments: FeedbackComment[]
    onClose: () => void
    onAddComment: (body: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════
   Chip helpers · idénticos a los de FeedbackStatusPage para consistencia.
   ═══════════════════════════════════════════════════════════════════════ */

// Tokens semánticos del DS Strata (status-info / status-warning / status-success).
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

/* ═══════════════════════════════════════════════════════════════════════
   Date formatting
   ═══════════════════════════════════════════════════════════════════════ */

function formatDate(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return iso.slice(0, 10)
    }
}

function formatDateTime(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   CompactField · wrapper para rows del left panel (label + value).
   ═══════════════════════════════════════════════════════════════════════ */

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
            </div>
            <div className="text-sm text-foreground">
                {children}
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════════════ */

export default function UserFeedbackDetailModal({
    feedback,
    comments,
    onClose,
    onAddComment,
}: UserFeedbackDetailModalProps) {
    const [draft, setDraft] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const isOpen = feedback !== null

    // Reset draft cada vez que se abre un ticket distinto.
    useEffect(() => {
        if (feedback) setDraft('')
    }, [feedback?.id])

    // Scroll al último mensaje cuando el thread crece.
    useEffect(() => {
        if (!isOpen) return
        const el = scrollRef.current
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight
            })
        }
    }, [isOpen, comments.length])

    const handleSend = () => {
        const trimmed = draft.trim()
        if (!trimmed) return
        onAddComment(trimmed)
        setDraft('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+Enter / Cmd+Enter → send · pattern espejo del expert-hub.
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                                {feedback && (
                                    <>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {feedback.id}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_CHIP[feedback.state]}`}>
                                                        {feedback.state}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_CHIP[feedback.category]}`}>
                                                        {feedback.category}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CHIP[feedback.severity]}`}>
                                                        {feedback.severity}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {stateHelperText(feedback.state)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                aria-label="Close"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Body · left metadata + right chat */}
                                        <div className="flex flex-col lg:flex-row" style={{ height: 'min(75vh, 640px)' }}>
                                            {/* Left panel · metadata */}
                                            <aside className="border-b border-border lg:border-b-0 lg:border-r lg:w-80 lg:shrink-0 overflow-y-auto p-4 space-y-4 bg-background">
                                                <CompactField label="Description">
                                                    <p className="text-sm text-foreground whitespace-pre-wrap">
                                                        {feedback.description}
                                                    </p>
                                                </CompactField>

                                                <CompactField label="Submitted">
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDate(feedback.date)}
                                                    </span>
                                                </CompactField>

                                                {feedback.assignedToName && (
                                                    <CompactField label="Assigned to">
                                                        <span className="text-sm text-foreground">
                                                            {feedback.assignedToName}
                                                        </span>
                                                    </CompactField>
                                                )}

                                                {feedback.jira && (
                                                    <CompactField label="Jira">
                                                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                            {feedback.jira}
                                                        </span>
                                                    </CompactField>
                                                )}

                                                {(feedback.workspace || feedback.experience) && (
                                                    <CompactField label="Context">
                                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                                            {feedback.workspace && <div>Workspace · {feedback.workspace}</div>}
                                                            {feedback.experience && <div>Experience · {feedback.experience}</div>}
                                                            {feedback.context?.vendor && <div>Vendor · {feedback.context.vendor}</div>}
                                                            {feedback.context?.docId && (
                                                                <div>Doc · <span className="font-mono">{feedback.context.docId}</span></div>
                                                            )}
                                                        </div>
                                                    </CompactField>
                                                )}

                                                {feedback.attachment && (
                                                    <CompactField label="Attachment">
                                                        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                                                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {feedback.attachment.name}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {feedback.attachment.type} · {feedback.attachment.sizeKB} KB
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CompactField>
                                                )}
                                            </aside>

                                            {/* Right panel · chat thread */}
                                            <section className="flex flex-1 min-w-0 flex-col">
                                                <div
                                                    ref={scrollRef}
                                                    className="flex-1 overflow-y-auto p-4 space-y-3"
                                                >
                                                    {comments.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                                            <p className="text-sm text-muted-foreground max-w-xs">
                                                                No replies yet. The support team will follow up here.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        comments.map(c => {
                                                            const isReporter = c.role === 'reporter'
                                                            return (
                                                                <div
                                                                    key={c.id}
                                                                    className={`flex ${isReporter ? 'justify-end' : 'justify-start'}`}
                                                                >
                                                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                                                                        isReporter
                                                                            ? 'bg-primary/15 text-foreground rounded-br-sm'
                                                                            : 'bg-muted text-foreground rounded-bl-sm border border-border'
                                                                    }`}>
                                                                        <div className="flex items-baseline gap-2 mb-1">
                                                                            <span className="text-[11px] font-semibold text-foreground">
                                                                                {isReporter ? 'You' : c.author}
                                                                            </span>
                                                                            {!isReporter && (
                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                    Support team
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                                                {formatDateTime(c.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm whitespace-pre-wrap">
                                                                            {c.body}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>

                                                {/* Composer */}
                                                <div className="border-t border-border p-3 bg-background/60">
                                                    <div className="flex items-end gap-2">
                                                        <textarea
                                                            value={draft}
                                                            onChange={e => setDraft(e.target.value)}
                                                            onKeyDown={handleKeyDown}
                                                            placeholder="Reply to the support team…"
                                                            rows={2}
                                                            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleSend}
                                                            disabled={!draft.trim()}
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Send (Ctrl+Enter)"
                                                        >
                                                            <Send className="h-3.5 w-3.5" />
                                                            Send
                                                        </button>
                                                    </div>
                                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                                        Ctrl+Enter to send
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
