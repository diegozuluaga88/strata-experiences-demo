// TT.6 · Diego 2026-09-03 · Per-designer drill-down modal.
// Row-click from UtilizationHeatmap / OutlierCoachingCard / TrainingGap
// opens this. Shows: week entries list (with memos) + filter chips
// (project/task-type) + billable/internal split + CSV export.
//
// Match doc: "employees ven tiempo de otros" (analysis L117) es OK ·
// útil para manager cuando alguien toma over de un project.

import { useMemo, useState, Fragment } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { X, Download, Filter } from 'lucide-react'
import { getProject } from '../../data/projects'
import { getTaskType, formatTaskLabel, TASK_TYPES, GROUP_ORDER, GROUP_LABEL } from '../../data/taskTypes'
import { getTeamMember, avatarGradient } from '../team/teamMembers'
import { entriesForDesignerRange, DESIGNER_CAPACITY_HOURS, sumHours, formatTimeOfDay, type TimeEntry, type DesignerId } from '../../data/timeEntries'
import { weekDays } from '../../data/managerInsights'

interface Props {
    isOpen: boolean
    onClose: () => void
    designerId: DesignerId | null
    weekMondayIso: string
    allEntries: TimeEntry[]
    summerFridaysActive?: boolean
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DesignerDrilldown({ isOpen, onClose, designerId, weekMondayIso, allEntries, summerFridaysActive }: Props) {
    const [projectFilter, setProjectFilter] = useState<string | 'all'>('all')
    const [taskFilter, setTaskFilter] = useState<string | 'all'>('all')

    const days = useMemo(() => weekDays(weekMondayIso), [weekMondayIso])
    const person = designerId ? getTeamMember(designerId) : null
    const weekEntries = useMemo(() => {
        if (!designerId) return []
        return entriesForDesignerRange(designerId, days[0], days[6], allEntries)
    }, [designerId, days, allEntries])

    const filtered = useMemo(() => weekEntries.filter(e =>
        (projectFilter === 'all' || e.projectId === projectFilter) &&
        (taskFilter === 'all' || e.taskTypeId === taskFilter)
    ), [weekEntries, projectFilter, taskFilter])

    const billable = sumHours(filtered.filter(e => e.billable))
    const internal = sumHours(filtered.filter(e => !e.billable))
    const total = billable + internal
    const baseCap = designerId ? (DESIGNER_CAPACITY_HOURS[designerId] ?? 40) : 40
    const capacity = summerFridaysActive ? Math.max(0, baseCap - 4) : baseCap
    const pct = capacity > 0 ? Math.round((total / capacity) * 100) : 0

    const uniqueProjects = useMemo(() => {
        const ids = new Set(weekEntries.map(e => e.projectId))
        return Array.from(ids).map(id => ({ id, project: getProject(id) })).filter(x => x.project)
    }, [weekEntries])

    const exportCsv = () => {
        const rows: string[][] = [
            ['Date', 'Day', 'Start', 'Duration (h)', 'Project', 'Client', 'Task Type', 'Billable', 'Memo'],
        ]
        for (const e of [...filtered].sort((a, b) => a.date.localeCompare(b.date) || (a.startMinutesFromMidnight ?? 0) - (b.startMinutesFromMidnight ?? 0))) {
            const project = getProject(e.projectId)
            const task = getTaskType(e.taskTypeId)
            rows.push([
                e.date,
                new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' }),
                e.startMinutesFromMidnight != null ? formatTimeOfDay(e.startMinutesFromMidnight) : '',
                (e.durationMinutes / 60).toFixed(2),
                project?.name ?? e.projectId,
                project?.client ?? '',
                task ? formatTaskLabel(task, e.completionState) : e.taskTypeId,
                e.billable ? 'yes' : 'no',
                (e.memo ?? '').replace(/"/g, '""'),
            ])
        }
        const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${person?.name?.replace(/ /g, '_') ?? designerId}-week-${days[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <Transition show={isOpen && !!designerId} as={Fragment}>
            <Dialog as="div" className="relative z-[125]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-md" />
                </TransitionChild>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-6 pt-16">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-260" enterFrom="opacity-0 translate-y-2 scale-[0.995]" enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.995]"
                        >
                            <DialogPanel className="w-full max-w-[900px] rounded-2xl bg-card border border-border shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
                                {/* Header */}
                                <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
                                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${designerId ? avatarGradient(designerId) : 'from-muted to-muted'} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                        {person?.initials ?? '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Week drill-down</div>
                                        <h3 className="text-lg font-semibold text-foreground truncate">{person?.name ?? designerId}</h3>
                                        <div className="text-xs text-muted-foreground tabular-nums">
                                            {formatWeek(days[0], days[6])} · capacity {capacity}h
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Close">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Totals stripe */}
                                <div className="grid grid-cols-4 gap-0 border-b border-border">
                                    <StatCell label="Billable" value={`${billable.toFixed(1)}h`} tone="success" />
                                    <StatCell label="Internal" value={`${internal.toFixed(1)}h`} tone="info" />
                                    <StatCell label="Total" value={`${total.toFixed(1)}h`} tone="foreground" />
                                    <StatCell label="Capacity" value={`${pct}%`} tone={pct >= 110 ? 'ai' : pct >= 80 ? 'success' : pct >= 70 ? 'warning' : 'destructive'} />
                                </div>

                                {/* Filter chips */}
                                <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-wrap bg-muted/20">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Filter className="h-3 w-3" />
                                        Filter
                                    </div>
                                    <ChipSelect
                                        value={projectFilter}
                                        onChange={setProjectFilter}
                                        options={[{ value: 'all', label: 'All projects' }, ...uniqueProjects.map(p => ({ value: p.id, label: p.project!.name }))]}
                                    />
                                    <ChipSelect
                                        value={taskFilter}
                                        onChange={setTaskFilter}
                                        options={[{ value: 'all', label: 'All tasks' }, ...GROUP_ORDER.flatMap(g => TASK_TYPES.filter(t => t.group === g).map(t => ({ value: t.id, label: `${GROUP_LABEL[g]} · ${t.label}` })))]}
                                    />
                                    <button
                                        type="button"
                                        onClick={exportCsv}
                                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-foreground border border-input rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
                                        title="Download week entries as CSV"
                                    >
                                        <Download className="h-3 w-3" />
                                        Export CSV
                                    </button>
                                </div>

                                {/* Entries list · grouped by day */}
                                <div className="flex-1 overflow-y-auto">
                                    {days.map((iso, i) => {
                                        const dayEntries = filtered.filter(e => e.date === iso)
                                        if (dayEntries.length === 0) return null
                                        const isWeekend = i >= 5
                                        const dayHours = sumHours(dayEntries)
                                        return (
                                            <div key={iso} className={`border-b border-border last:border-0 ${isWeekend ? 'opacity-70' : ''}`}>
                                                <div className="flex items-baseline justify-between px-6 py-2 bg-muted/30">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{DAY_LABELS[i]}</span>
                                                        <span className="text-sm font-semibold text-foreground tabular-nums">{new Date(iso).getDate()}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground tabular-nums">{dayHours.toFixed(1)}h</span>
                                                </div>
                                                <ul className="divide-y divide-border">
                                                    {[...dayEntries].sort((a, b) => (a.startMinutesFromMidnight ?? 0) - (b.startMinutesFromMidnight ?? 0)).map(e => <EntryRow key={e.id} entry={e} />)}
                                                </ul>
                                            </div>
                                        )
                                    })}
                                    {filtered.length === 0 && (
                                        <div className="text-center py-12 text-sm text-muted-foreground">
                                            No entries match the filters.
                                        </div>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

function StatCell({ label, value, tone }: { label: string; value: string; tone: 'foreground' | 'success' | 'info' | 'warning' | 'destructive' | 'ai' }) {
    const toneClass =
        tone === 'success' ? 'text-success' :
        tone === 'info' ? 'text-info' :
        tone === 'warning' ? 'text-warning' :
        tone === 'destructive' ? 'text-destructive' :
        tone === 'ai' ? 'text-ai' :
        'text-foreground'
    return (
        <div className="px-4 py-3 border-r border-border last:border-r-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`text-2xl font-semibold tabular-nums mt-0.5 ${toneClass}`}>{value}</div>
        </div>
    )
}

function ChipSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs bg-input-background/30 border border-input shadow-sm rounded-md px-2 py-1 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    )
}

function EntryRow({ entry }: { entry: TimeEntry }) {
    const project = getProject(entry.projectId)
    const task = getTaskType(entry.taskTypeId)
    const hours = (entry.durationMinutes / 60).toFixed(2).replace(/\.?0+$/, '')
    const tone = entry.billable ? 'bg-success' : 'bg-info'
    return (
        <li className="px-6 py-2.5 flex items-start gap-3 text-sm hover:bg-muted/30 transition-colors">
            <span className={`mt-1.5 h-2 w-2 rounded-full ${tone} shrink-0`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{task ? formatTaskLabel(task, entry.completionState) : 'Untagged'}</span>
                    {project && <span className="text-xs text-muted-foreground">· {project.name}</span>}
                    {entry.deliverableComplete && <span className="text-[9px] uppercase tracking-wider font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">✓ Delivered</span>}
                </div>
                {entry.memo && <div className="text-xs text-muted-foreground mt-0.5">{entry.memo}</div>}
            </div>
            <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-foreground tabular-nums">{hours}h</div>
                {entry.startMinutesFromMidnight != null && (
                    <div className="text-[10px] text-muted-foreground font-mono tabular-nums">{formatTimeOfDay(entry.startMinutesFromMidnight)}</div>
                )}
            </div>
        </li>
    )
}

function formatWeek(mondayIso: string, sundayIso: string): string {
    const s = new Date(mondayIso)
    const e = new Date(sundayIso)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const startStr = s.toLocaleDateString('en-US', opts)
    const endStr = s.getMonth() === e.getMonth() ? e.getDate() : e.toLocaleDateString('en-US', opts)
    return `${startStr}–${endStr}`
}
