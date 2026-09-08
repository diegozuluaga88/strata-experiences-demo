// TT.6 + TT.42.1 · Diego 2026-09-03/07 · Outlier coaching cards.
// 3-tier severity (amber ≥4h · red ≥6h) · pain #6.
// Copy tone locked as coaching per doc: "Kate logged 5.5h on Block Plan
// Onboarding — worth a check-in?" NEVER "Flagged: unusual entry".
//
// TT.42.1 · composer inline expandible · click 'Check in' expande la row
// con textarea pre-filled + Send/Cancel · el manager escribe su mensaje
// custom antes de disparar el toast (fixes fire-and-forget del icon-only).

import { useState } from 'react'
import { AlertTriangle, Send, MessageCircle, X } from 'lucide-react'
import { getProject } from '../../data/projects'
import { getTaskType } from '../../data/taskTypes'
import { getTeamMember, avatarGradient } from '../team/teamMembers'
import { coachingCopy } from '../../data/coachingCopy'
import type { Outlier } from '../../data/managerInsights'

interface Props {
    outliers: Outlier[]
    onSendMessage?: (designerId: string, entryId: string, message?: string) => void
}

export default function OutlierCoachingCard({ outliers, onSendMessage }: Props) {
    if (outliers.length === 0) return null
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Long sessions to check in on</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Single entries over 4h vs the designer's own 4-week baseline · click 'Check in' to draft a coaching message.</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{outliers.length}</span>
            </div>
            <ul className="space-y-2">
                {outliers.slice(0, 5).map(o => <OutlierRow key={o.entry.id} outlier={o} onSendMessage={onSendMessage} />)}
                {outliers.length > 5 && (
                    <li className="px-3 py-2 text-center text-xs text-muted-foreground">+ {outliers.length - 5} more</li>
                )}
            </ul>
        </div>
    )
}

function OutlierRow({ outlier, onSendMessage }: { outlier: Outlier; onSendMessage?: (designerId: string, entryId: string, message?: string) => void }) {
    const { entry, tier, hoursAboveAvg } = outlier
    const person = getTeamMember(entry.designerId)
    const project = getProject(entry.projectId)
    const taskType = getTaskType(entry.taskTypeId)
    const hours = entry.durationMinutes / 60
    const toneBg = tier === 'red' ? 'bg-destructive-soft border-destructive/40' : 'bg-warning-soft border-warning/40'
    const toneChip = tier === 'red' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
    const iconTone = tier === 'red' ? 'text-destructive' : 'text-warning'
    const copy = coachingCopy.outlierDetected({
        designerName: person?.name ?? entry.designerId,
        hoursLogged: hours,
        projectName: taskType?.label ?? 'a task',
        hoursAboveAvg: hoursAboveAvg,
    })

    // TT.42.1 · composer state
    const [isComposing, setIsComposing] = useState(false)
    const [draft, setDraft] = useState('')
    const firstName = (person?.name ?? entry.designerId).split(' ')[0]
    const defaultMessage = `Hey ${firstName} — saw the ${hours.toFixed(1)}h ${taskType?.label ?? 'session'}. That's a lot heads-down. Anything blocking you or is it just heavy work? Happy to jump on for 10 min if useful.`

    const openComposer = () => {
        setDraft(defaultMessage)
        setIsComposing(true)
    }
    const cancel = () => {
        setIsComposing(false)
        setDraft('')
    }
    const send = () => {
        if (!onSendMessage) return
        onSendMessage(entry.designerId, entry.id, draft.trim() || defaultMessage)
        setIsComposing(false)
        setDraft('')
    }

    return (
        <li>
            <div className={`rounded-lg border ${toneBg} ${isComposing ? 'ring-2 ring-primary/30' : ''} transition-shadow`}>
                <div className="p-3 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                        <AlertTriangle className={`h-4 w-4 ${iconTone}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${toneChip}`}>
                                {tier === 'red' ? 'Long' : 'Above avg'}
                            </span>
                            <span className="text-sm font-semibold text-foreground truncate">{person?.name ?? entry.designerId}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{hours.toFixed(1)}h on {taskType?.label ?? 'task'}</span>
                            {project && <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground truncate">{project.client}</span>
                            </>}
                        </div>
                        <p className="text-xs text-foreground leading-snug">{copy}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(entry.designerId)} flex items-center justify-center text-white text-[9px] font-bold`}>
                            {person?.initials}
                        </div>
                        {onSendMessage && !isComposing && (
                            <button
                                type="button"
                                onClick={openComposer}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-input-background/30 border border-input shadow-sm rounded-md px-2.5 py-1.5 hover:bg-input-background/60 transition-colors"
                                title={`Draft a check-in message to ${person?.name ?? 'this designer'}`}
                            >
                                <MessageCircle className="h-3 w-3" />
                                Check in
                            </button>
                        )}
                    </div>
                </div>

                {/* TT.42.1 · Composer inline expandido */}
                {isComposing && (
                    <div className="border-t border-border/60 p-3 space-y-2 bg-background/40 rounded-b-lg">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Check-in message to {person?.name?.split(' ')[0] ?? entry.designerId}
                        </label>
                        <textarea
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => {
                                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() }
                                if (e.key === 'Escape') cancel()
                            }}
                            rows={3}
                            className="w-full px-3 py-2 text-sm bg-input-background/30 border border-input shadow-sm rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 resize-none transition-colors"
                            placeholder="Write a friendly check-in..."
                        />
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">Coaching tone · ⌘↵ to send · Esc to cancel</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={cancel}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={draft.trim().length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="h-3 w-3" />
                                    Send check-in
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </li>
    )
}
