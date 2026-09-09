import { Fragment, useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { MessageSquare, Copy, X, UserPlus, Paperclip, FileText, Download, ExternalLink, Clock, Eye, UserCheck, CheckCircle2, Lock, Ban, Users, ThumbsUp, Send } from 'lucide-react'
import type { FeedbackItem, FeedbackState, Severity, Category, FeedbackComment } from '../../FeedbackBoard'
import { solidAvatarColor } from '../team/teamMembers'

// Feedback detail · refinement v3 (2026-06-29):
// - Chat panel siempre visible (sin toggle button)
// - Status row horizontal compacto con transitions inline
// - Fields en 2-col grid · menos whitespace
// - Avatares h-7 (más proporcionales)
// - Attachment horizontal de una sola línea

interface FeedbackDetailModalProps {
    isOpen: boolean
    onClose: () => void
    feedback: FeedbackItem | null
    onTransition: (id: string, next: FeedbackState) => void
    duplicateGroupSize?: number
    meTooCount?: number
    onMeToo?: () => void
    comments?: FeedbackComment[]
    onAddComment?: (body: string, role: 'reporter' | 'expert') => void
    onOpenAssign?: (feedbackId: string) => void
}

interface StatusPresentation {
    icon: typeof Clock
    label: string
    helper: string
    iconColor: string
    bgColor: string
    borderColor: string
}

function statusPresentation(state: FeedbackState): StatusPresentation {
    switch (state) {
        case 'Submitted':
            return { icon: Clock, label: 'Submitted', helper: 'Waiting for expert review',
                iconColor: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' }
        case 'Triaged':
            return { icon: Eye, label: 'Triaged', helper: 'Reviewed · pending assignment',
                iconColor: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' }
        case 'Assigned':
            return { icon: UserCheck, label: 'Assigned', helper: 'Owner picked up the work',
                iconColor: 'text-amber-600', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' }
        case 'Resolved':
            return { icon: CheckCircle2, label: 'Resolved', helper: 'Fix delivered · pending closure',
                iconColor: 'text-green-600', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' }
        case 'Closed':
            return { icon: Lock, label: 'Closed', helper: 'Loop complete · no further action',
                iconColor: 'text-muted-foreground', bgColor: 'bg-muted', borderColor: 'border-border' }
        case 'Dropped':
            return { icon: Ban, label: 'Dropped', helper: 'Out of scope · won’t fix',
                iconColor: 'text-muted-foreground', bgColor: 'bg-muted', borderColor: 'border-border' }
        case 'Duplicated':
            return { icon: Copy, label: 'Duplicated', helper: 'Linked to an existing report',
                iconColor: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' }
    }
}

interface ActionOption { label: string; target: FeedbackState }
function nextActions(state: FeedbackState): ActionOption[] {
    switch (state) {
        case 'Submitted':  return [{ label: 'Triaged', target: 'Triaged' }, { label: 'Dropped', target: 'Dropped' }, { label: 'Duplicated', target: 'Duplicated' }]
        case 'Triaged':    return [{ label: 'Resolved', target: 'Resolved' }, { label: 'Dropped', target: 'Dropped' }, { label: 'Duplicated', target: 'Duplicated' }]
        case 'Assigned':   return [{ label: 'Resolved', target: 'Resolved' }, { label: 'Dropped', target: 'Dropped' }, { label: 'Duplicated', target: 'Duplicated' }]
        case 'Resolved':   return [{ label: 'Closed', target: 'Closed' }, { label: 'Reopen', target: 'Submitted' }]
        case 'Closed':     return [{ label: 'Reopen', target: 'Submitted' }]
        case 'Dropped':    return [{ label: 'Reopen', target: 'Submitted' }]
        case 'Duplicated': return [{ label: 'Reopen', target: 'Submitted' }]
    }
}

function categoryPillClasses(c: Category): string {
    switch (c) {
        case 'Bug':              return 'bg-destructive/10 text-destructive'
        case 'Feature Request':  return 'bg-blue-500/10 text-blue-600'
        case 'UI/UX':            return 'bg-indigo-500/10 text-indigo-600'
        case 'Data':             return 'bg-amber-500/10 text-amber-600'
        case 'Performance':      return 'bg-cyan-500/10 text-cyan-600'
    }
}

function severityPillClasses(s: Severity): string {
    switch (s) {
        case 'Critical': return 'bg-destructive/10 text-destructive'
        case 'High':     return 'bg-destructive/10 text-destructive'
        case 'Medium':   return 'bg-amber-500/10 text-amber-600'
        case 'Low':      return 'bg-muted text-muted-foreground'
    }
}

function statusBadgeClasses(s: FeedbackState): string {
    switch (s) {
        case 'Submitted':  return 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
        case 'Triaged':    return 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
        case 'Assigned':   return 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
        case 'Resolved':   return 'bg-green-500/10 text-green-600 border border-green-500/20'
        case 'Closed':     return 'bg-muted text-muted-foreground border border-border'
        case 'Dropped':    return 'bg-muted text-muted-foreground border border-border'
        case 'Duplicated': return 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
    }
}

function shortId(id: string): string {
    const cleaned = id.replace(/^FB-/i, '')
    return cleaned.length > 8 ? cleaned.slice(0, 8).toUpperCase() : cleaned.toUpperCase()
}

function formatTimestamp(date: string): string {
    if (!date) return '—'
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
        return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    }
    return `${date}, 13:16:51`
}

function emailFromHandle(handle: string): string {
    if (handle.includes('@')) return handle
    return `${handle.toLowerCase()}@special-t.com`
}

function nameFromEmail(email: string): string {
    const local = email.split('@')[0]
    return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export default function FeedbackDetailModal({
    isOpen, onClose, feedback, onTransition,
    duplicateGroupSize = 1, meTooCount = 0, onMeToo,
    comments = [], onAddComment, onOpenAssign,
}: FeedbackDetailModalProps) {
    if (!feedback) return null

    const isDuplicate = duplicateGroupSize > 1
    const totalAffected = duplicateGroupSize + meTooCount
    const presentation = statusPresentation(feedback.state)
    const StatusIcon = presentation.icon
    const actions = nextActions(feedback.state)
    const submittedByEmail = emailFromHandle(feedback.submittedBy)
    const submittedByName = nameFromEmail(submittedByEmail)
    const initials = submittedByName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()
    const idChip = shortId(feedback.id)

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150"  leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-card text-left shadow-2xl border border-border flex flex-row h-[85vh]">
                                {/* ============ MAIN COLUMN ============ */}
                                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                    {/* HEADER */}
                                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <h2 className="text-base font-semibold text-foreground">Feedback Detail</h2>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard?.writeText(feedback.id)}
                                                title="Copy ID"
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-mono text-muted-foreground hover:bg-muted/80 transition-colors"
                                            >
                                                #{idChip}
                                                <Copy className="h-3 w-3" />
                                            </button>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryPillClasses(feedback.category)}`}>
                                                {feedback.category === 'Bug' ? 'Bug Report' : feedback.category}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityPillClasses(feedback.severity)}`}>
                                                {feedback.severity}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadgeClasses(feedback.state)}`}>
                                            {feedback.state}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                            aria-label="Close"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* BODY · single scroll */}
                                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                        {/* STATUS ROW · horizontal compacto + transitions inline */}
                                        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${presentation.bgColor} ${presentation.borderColor}`}>
                                            <div className={`h-9 w-9 rounded-lg bg-card flex items-center justify-center shrink-0 ${presentation.iconColor}`}>
                                                <StatusIcon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                                                    <span className={`text-sm font-bold ${presentation.iconColor}`}>{presentation.label}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">{presentation.helper}</div>
                                            </div>
                                            {actions.length > 0 && (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {actions.map(action => (
                                                        <button
                                                            key={action.label}
                                                            type="button"
                                                            onClick={() => onTransition(feedback.id, action.target)}
                                                            className="px-2.5 py-1 rounded-md bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted hover:border-foreground/30 transition-colors shadow-sm"
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* DESCRIPTION · full width */}
                                        <div>
                                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                                            <p className="text-sm text-foreground">{feedback.description}</p>
                                        </div>

                                        {/* META GRID · 2 cols · Assigned to encima de Experience */}
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <CompactField label="Submitted by">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-7 w-7 rounded-full ${solidAvatarColor(initials)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-foreground truncate">{submittedByName}</div>
                                                        <div className="text-[11px] text-muted-foreground truncate">{submittedByEmail}</div>
                                                    </div>
                                                </div>
                                            </CompactField>

                                            <CompactField label="Assigned to">
                                                {feedback.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-7 w-7 rounded-full ${solidAvatarColor(feedback.assignedTo.initials)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                                            {feedback.assignedTo.initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-foreground truncate">{feedback.assignedTo.name}</div>
                                                            <div className="text-[11px] text-muted-foreground">Owner</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenAssign?.(feedback.id)}
                                                        disabled={!onOpenAssign}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <UserPlus className="h-3.5 w-3.5" />
                                                        Assign
                                                    </button>
                                                )}
                                            </CompactField>

                                            <CompactField label="Submitted at">
                                                <p className="text-sm text-foreground">{formatTimestamp(feedback.date)}</p>
                                            </CompactField>

                                            <CompactField label="Experience">
                                                <p className="text-sm text-foreground">{feedback.experience ?? 'expert-hub'}</p>
                                            </CompactField>

                                            <CompactField label="Jira">
                                                {feedback.jira ? (
                                                    <a
                                                        href={`https://jira.strata.local/browse/${feedback.jira}`}
                                                        onClick={(e) => e.preventDefault()}
                                                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {feedback.jira}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">Not promoted yet</span>
                                                )}
                                            </CompactField>

                                            <CompactField label="Feedback ID">
                                                <span className="text-sm font-mono text-foreground">{feedback.id}</span>
                                            </CompactField>
                                        </div>

                                        {/* FB-07 · Duplicate / Me-too · row compacta */}
                                        {(isDuplicate || meTooCount > 0) && (
                                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
                                                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-foreground">
                                                        Affecting {totalAffected} user{totalAffected === 1 ? '' : 's'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {isDuplicate && `${duplicateGroupSize} similar report${duplicateGroupSize === 1 ? '' : 's'}`}
                                                        {isDuplicate && meTooCount > 0 && ' · '}
                                                        {meTooCount > 0 && `${meTooCount} "Me too" vote${meTooCount === 1 ? '' : 's'}`}
                                                    </div>
                                                </div>
                                                {onMeToo && (
                                                    <button
                                                        type="button"
                                                        onClick={onMeToo}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
                                                        title="I'm affected by this too"
                                                    >
                                                        <ThumbsUp className="h-3 w-3" />
                                                        Me too
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* ATTACHMENT · single-row horizontal */}
                                        {feedback.attachment && (
                                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                                                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="h-9 w-9 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-foreground truncate">{feedback.attachment.name}</div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <span className="inline-flex items-center px-1.5 py-0 rounded bg-muted font-mono uppercase text-[10px]">
                                                            {feedback.attachment.type}
                                                        </span>
                                                        <span>· {feedback.attachment.sizeKB.toFixed(1)} KB</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                                                        <Download className="h-3 w-3" />
                                                        Download
                                                    </button>
                                                    <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                                                        <ExternalLink className="h-3 w-3" />
                                                        Open
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ============ CHAT SIDE PANEL · always visible ============ */}
                                <div className="w-[380px] shrink-0 border-l border-border flex flex-col overflow-hidden bg-muted/20">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
                                        {comments.length > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                                                {comments.length}
                                            </span>
                                        )}
                                    </div>
                                    <ChatThread
                                        comments={comments}
                                        reporterName={submittedByName.split(' ')[0] || 'Reporter'}
                                        onAddComment={onAddComment}
                                    />
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
            <div>{children}</div>
        </div>
    )
}

function ChatThread({
    comments, reporterName, onAddComment,
}: {
    comments: FeedbackComment[]
    reporterName: string
    onAddComment?: (body: string, role: 'reporter' | 'expert') => void
}) {
    const [draft, setDraft] = useState('')
    const [role, setRole] = useState<'expert' | 'reporter'>('expert')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [comments.length])

    const handleSend = () => {
        const body = draft.trim()
        if (!body || !onAddComment) return
        onAddComment(body, role)
        setDraft('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend() }
    }

    const formatTimestamp = (iso: string): string => {
        try {
            const d = new Date(iso)
            return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        } catch { return iso }
    }

    return (
        <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">No conversation yet</p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">Reply below to start the back-and-forth with the reporter.</p>
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className={`flex items-start gap-2 ${c.role === 'expert' ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-7 w-7 rounded-full ${solidAvatarColor(c.initials)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                {c.initials}
                            </div>
                            <div className={`flex-1 max-w-[80%] ${c.role === 'expert' ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`text-[10px] text-muted-foreground mb-0.5 ${c.role === 'expert' ? 'text-right' : ''}`}>
                                    <span className="font-semibold text-foreground">{c.author}</span>
                                    <span className="mx-1">·</span>
                                    <span>{formatTimestamp(c.createdAt)}</span>
                                </div>
                                <div className={`rounded-xl px-3 py-2 text-xs text-foreground ${
                                    c.role === 'expert'
                                        ? 'bg-blue-500/10 border border-blue-500/20 rounded-tr-sm'
                                        : 'bg-card border border-border rounded-tl-sm'
                                }`}>
                                    {c.body}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {onAddComment && (
                <div className="px-4 py-3 border-t border-border bg-card space-y-2 shrink-0">
                    <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">Reply as</span>
                        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                            <button
                                type="button"
                                onClick={() => setRole('expert')}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                    role === 'expert' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                            >
                                Expert
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('reporter')}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                    role === 'reporter' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                                }`}
                            >
                                {reporterName ? `Reporter (${reporterName})` : 'Reporter'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                            placeholder="Write a reply… (⌘/Ctrl+Enter to send)"
                            className="flex-1 px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!draft.trim()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                            title="Send"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
