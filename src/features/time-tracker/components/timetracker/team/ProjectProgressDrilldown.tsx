// TT.65.1 · Diego 2026-09-09 · Project progress drill-down modal.
// "seria bueno que al tocar un proyecto se vean el listado de tareas
// cumplidas y las que faltan".
//
// Modal Headless UI · click project row → abre este modal · muestra:
//   1. Header · project name + progress summary (hours + %) + status pill
//   2. Sección "Deliverables sent" · entries con deliverableComplete=true
//      (task type · designer · fecha · hours · memo trunc)
//   3. Sección "Ongoing work" · entries sin deliverableComplete (recent first)
//   4. Card lateral · breakdown por task type (hours + count)

import { Fragment } from 'react'
import { Dialog, Transition, DialogPanel, TransitionChild } from '@headlessui/react'
import { X, CheckCircle2, Clock, Target, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react'
import { buildProjectDrilldown, type ProjectProgressRow, type ProjectProgressStatus } from '../../../data/managerInsights'
import { getTeamMember, avatarGradient } from '../../team/teamMembers'
import type { TimeEntry } from '../../../data/timeEntries'

interface Props {
    row: ProjectProgressRow | null
    allEntries: TimeEntry[]
    onClose: () => void
}

const STATUS_META: Record<ProjectProgressStatus, { label: string; pillBg: string; pillText: string; icon: React.ComponentType<{ className?: string }> }> = {
    past: { label: 'Past the plan', pillBg: 'bg-destructive/15', pillText: 'text-destructive', icon: AlertTriangle },
    near: { label: 'Near the limit', pillBg: 'bg-warning/15', pillText: 'text-warning', icon: TrendingUp },
    'on-track': { label: 'On track', pillBg: 'bg-success/15', pillText: 'text-success', icon: Target },
    early: { label: 'Early', pillBg: 'bg-muted', pillText: 'text-muted-foreground', icon: Sparkles },
}

export default function ProjectProgressDrilldown({ row, allEntries, onClose }: Props) {
    const open = !!row
    const drilldown = row ? buildProjectDrilldown(row.project.id, allEntries) : null
    const meta = row ? STATUS_META[row.status] : null

    return (
        <Transition show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-md" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 pt-16">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-[0.995]" enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                        >
                            <DialogPanel className="w-full max-w-[900px] max-h-[calc(100vh-6rem)] rounded-2xl bg-card border border-border shadow-lg overflow-hidden flex flex-col">
                                {row && meta && drilldown && (
                                    <>
                                        {/* Header */}
                                        <div className="p-6 border-b border-border shrink-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project drill-down</div>
                                                    <div className="flex items-center gap-3 flex-wrap mt-1">
                                                        <h3 className="text-lg font-semibold text-foreground truncate">{row.project.name}</h3>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${meta.pillBg} ${meta.pillText}`}>
                                                            <meta.icon className="h-3 w-3" />
                                                            {meta.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {row.project.client} · <span className="font-mono">{row.project.id}</span> · {row.project.company}
                                                    </div>
                                                </div>
                                                <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" aria-label="Close">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="mt-4">
                                                <div className="flex items-baseline justify-between text-xs mb-1.5">
                                                    <span className="text-muted-foreground">Progress vs plan</span>
                                                    <span className="tabular-nums text-foreground">
                                                        <span className="font-semibold">{row.hoursLogged.toFixed(1)}h</span>
                                                        <span className="text-muted-foreground"> / {row.budgetHours}h · </span>
                                                        <span className={`font-semibold ${meta.pillText}`}>{row.pctOfBudget}%</span>
                                                        <span className="text-muted-foreground"> · {row.remainingHours >= 0 ? `${row.remainingHours.toFixed(1)}h left` : `${Math.abs(row.remainingHours).toFixed(1)}h over`}</span>
                                                    </span>
                                                </div>
                                                <div className="relative h-2 rounded-full overflow-hidden bg-muted">
                                                    <div className={`absolute inset-y-0 left-0 transition-all ${row.status === 'past' ? 'bg-destructive' : row.status === 'near' ? 'bg-warning' : row.status === 'on-track' ? 'bg-success' : 'bg-muted-foreground/40'}`} style={{ width: `${Math.min(100, row.pctOfBudget)}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Body · grid 2fr / 1fr */}
                                        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-0 lg:divide-x lg:divide-border">
                                            {/* Left col · Deliverables + Ongoing */}
                                            <div className="p-6 space-y-6">
                                                <Section
                                                    icon={CheckCircle2}
                                                    tone="success"
                                                    title="Deliverables sent"
                                                    subtitle="Entries marked deliverable-complete · milestone hit"
                                                    count={drilldown.deliverablesSent.length}
                                                >
                                                    {drilldown.deliverablesSent.length === 0 ? (
                                                        <EmptyState label="No deliverables sent yet for this project." />
                                                    ) : (
                                                        <EntryList entries={drilldown.deliverablesSent} tone="success" />
                                                    )}
                                                </Section>

                                                <Section
                                                    icon={Clock}
                                                    tone="info"
                                                    title="Ongoing work"
                                                    subtitle="Recent entries not yet marked as delivered"
                                                    count={drilldown.ongoingWork.length}
                                                >
                                                    {drilldown.ongoingWork.length === 0 ? (
                                                        <EmptyState label="Nothing in-flight · all logged work is marked done." />
                                                    ) : (
                                                        <EntryList entries={drilldown.ongoingWork.slice(0, 8)} tone="info" />
                                                    )}
                                                    {drilldown.ongoingWork.length > 8 && (
                                                        <p className="mt-2 text-[11px] text-muted-foreground text-center">
                                                            +{drilldown.ongoingWork.length - 8} more entries
                                                        </p>
                                                    )}
                                                </Section>
                                            </div>

                                            {/* Right col · Task type breakdown */}
                                            <div className="p-6 bg-muted/20">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                                    Hours by task type
                                                </div>
                                                {drilldown.byTaskType.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">No entries logged for this project.</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {drilldown.byTaskType.map(t => {
                                                            const maxHours = drilldown.byTaskType[0].hours
                                                            const width = maxHours > 0 ? (t.hours / maxHours) * 100 : 0
                                                            return (
                                                                <li key={t.taskTypeId}>
                                                                    <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                                                                        <span className="text-foreground truncate">{t.label}</span>
                                                                        <span className="tabular-nums text-muted-foreground shrink-0">
                                                                            <span className="font-semibold text-foreground">{t.hours.toFixed(1)}h</span>
                                                                            <span className="text-muted-foreground"> · {t.entryCount}</span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                                        <div className="h-full bg-primary transition-all" style={{ width: `${width}%` }} />
                                                                    </div>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                                <div className="mt-6 pt-4 border-t border-border">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                                        Session total
                                                    </div>
                                                    <div className="text-xl font-semibold text-foreground tabular-nums">
                                                        {drilldown.totalHoursThisSession.toFixed(1)}h
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-1">
                                                        Live entries this session (added on top of baseline).
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

function Section({ icon: Icon, tone, title, subtitle, count, children }: { icon: React.ComponentType<{ className?: string }>; tone: 'success' | 'info'; title: string; subtitle: string; count: number; children: React.ReactNode }) {
    // TT.65.2 · Diego 2026-09-09 · icon container ahora usa text-foreground
    // (dark siempre readable) sobre bg-*-soft + ring de color · antes
    // text-primary sobre bg-primary-soft (lime sobre lime) fallaba WCAG (~1.5:1).
    const toneCls = tone === 'success'
        ? 'text-foreground bg-success-soft ring-1 ring-success/40'
        : 'text-foreground bg-primary-soft ring-1 ring-primary/40'
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${toneCls}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {title}
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{count}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    )
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            {label}
        </div>
    )
}

function EntryList({ entries, tone }: { entries: ReturnType<typeof buildProjectDrilldown>['deliverablesSent']; tone: 'success' | 'info' }) {
    const borderCls = tone === 'success' ? 'border-success/25' : 'border-border'
    return (
        <ul className="space-y-1.5">
            {entries.map(row => {
                const person = getTeamMember(row.entry.designerId)
                return (
                    <li key={row.entry.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${borderCls} bg-background/40`}>
                        <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(row.entry.designerId)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                            {person?.initials ?? row.entry.designerId.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground truncate">{row.taskLabel}</span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">· {row.hours.toFixed(2)}h</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                {person?.name ?? row.entry.designerId} · {formatDate(row.entry.date)}
                                {row.entry.memo && <span className="text-muted-foreground/70"> · &ldquo;{row.entry.memo.length > 60 ? row.entry.memo.slice(0, 60) + '…' : row.entry.memo}&rdquo;</span>}
                            </div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
        return iso
    }
}
