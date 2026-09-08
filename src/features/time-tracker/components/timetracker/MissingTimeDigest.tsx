// TT.6 · Diego 2026-09-03 · Missing-time Friday digest card.
// Match Clockify "one email, all reminders" pattern (batched digest ·
// no per-submission spam). Doc pain #1 severidad 4. Copy locked via
// coachingCopy.ts para tone coaching (no surveillance).
//
// Dispara un preview del email antes de send · confirm before dispatch
// (per UX review · H5 error prevention).

import { useState } from 'react'
import { Send, Mail, X, ChevronRight } from 'lucide-react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { getTeamMember, avatarGradient } from '../team/teamMembers'
import { coachingCopy } from '../../data/coachingCopy'
import type { MissingTimeInfo } from '../../data/managerInsights'

interface Props {
    missing: MissingTimeInfo[]
    weekMondayIso: string
    onSendDigest: (designerIds: string[]) => void
    /** TT.43.4 · Diego 2026-09-08 · click row → open drill-down modal
     *  para ver la actividad del designer en detalle. */
    onDesignerClick?: (designerId: string) => void
}

export default function MissingTimeDigest({ missing, weekMondayIso, onSendDigest, onDesignerClick }: Props) {
    const [previewOpen, setPreviewOpen] = useState(false)

    const names = missing.map(m => getTeamMember(m.designerId)?.name ?? m.designerId)
    const summaryCopy = coachingCopy.missingTimeReminder({ count: missing.length, names })

    if (missing.length === 0) {
        return null
    }

    return (
        <>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Card header · looks like an email envelope */}
                <div className="flex items-center gap-3 px-5 py-3 bg-muted/40 border-b border-border">
                    <div className="h-8 w-8 rounded-lg bg-warning-soft flex items-center justify-center">
                        <Mail className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Friday 12pm digest · preview</div>
                        <div className="text-sm font-semibold text-foreground">Missing time this week</div>
                    </div>
                    <span className="tabular-nums text-xs text-muted-foreground">{missing.length} designer{missing.length === 1 ? '' : 's'}</span>
                </div>
                {/* Body */}
                <div className="p-5 space-y-3">
                    <p className="text-sm text-foreground">{summaryCopy}</p>
                    <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                        {missing.slice(0, 5).map(m => {
                            const person = getTeamMember(m.designerId)
                            const clickable = !!onDesignerClick
                            const rowContent = (
                                <>
                                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatarGradient(m.designerId)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                                        {person?.initials ?? '?'}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-sm font-medium text-foreground truncate">{person?.name ?? m.designerId}</div>
                                        <div className="text-xs text-muted-foreground tabular-nums">
                                            {m.hoursLogged.toFixed(1)}h logged · target {m.capacityTarget.toFixed(1)}h
                                        </div>
                                    </div>
                                    <div className="text-xs font-semibold text-warning tabular-nums shrink-0">
                                        −{m.hoursMissing.toFixed(1)}h
                                    </div>
                                    {clickable && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity" />}
                                </>
                            )
                            return (
                                <li key={m.designerId}>
                                    {clickable ? (
                                        <button
                                            type="button"
                                            onClick={() => onDesignerClick!(m.designerId)}
                                            className="group/row w-full flex items-center gap-3 px-3 py-2.5 bg-background hover:bg-muted/40 transition-colors text-left"
                                            title={`View ${person?.name ?? m.designerId}'s activity this week`}
                                        >
                                            {rowContent}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-3 px-3 py-2.5 bg-background">{rowContent}</div>
                                    )}
                                </li>
                            )
                        })}
                        {missing.length > 5 && (
                            <li className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
                                + {missing.length - 5} more
                            </li>
                        )}
                    </ul>
                </div>
                {/* Footer with send action */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/20">
                    <span className="text-xs text-muted-foreground">Week of {formatWeek(weekMondayIso)}</span>
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 shadow-sm hover:bg-primary/90 transition-colors"
                        title="Send a friendly nudge to all designers below"
                    >
                        <Send className="h-3.5 w-3.5" />
                        Send digest
                    </button>
                </div>
            </div>

            {/* Confirm dialog with email preview */}
            <Transition show={previewOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[130]" onClose={() => setPreviewOpen(false)}>
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
                                <DialogPanel className="w-full max-w-[600px] rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</div>
                                            <h3 className="text-lg font-semibold text-foreground">Send friendly nudge</h3>
                                        </div>
                                        <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="text-sm text-muted-foreground">
                                            Will send an email to <span className="font-semibold text-foreground">{missing.length} designer{missing.length === 1 ? '' : 's'}</span>:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {missing.map(m => {
                                                const person = getTeamMember(m.designerId)
                                                return (
                                                    <div key={m.designerId} className={`inline-flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3 py-1`}>
                                                        <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarGradient(m.designerId)} flex items-center justify-center text-white text-[9px] font-bold`}>
                                                            {person?.initials}
                                                        </div>
                                                        <span className="text-xs font-medium text-foreground">{person?.name ?? m.designerId}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Message</div>
                                            <p className="italic">Hey — friendly reminder that this week's timesheet is due Sunday night. Let me know if anything's blocking you.</p>
                                            <div className="text-xs text-muted-foreground mt-3">— McKinley</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewOpen(false)}
                                            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { onSendDigest(missing.map(m => m.designerId)); setPreviewOpen(false) }}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 shadow-sm hover:bg-primary/90 transition-colors"
                                        >
                                            <Send className="h-4 w-4" />
                                            Send to {missing.length} · {missing.map(m => getTeamMember(m.designerId)?.initials).filter(Boolean).join(' ')}
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}

function formatWeek(mondayIso: string): string {
    const d = new Date(mondayIso)
    const end = new Date(d)
    end.setDate(d.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${d.toLocaleDateString('en-US', opts)}–${end.getDate()}`
}
