// SOURCE: config-evolution/time-tracker/src/TimeTracker.tsx
// Lift for demo-2026-strata profile · time-tracker · 2026-09-08
// Adaptation · strip the standalone Navbar/onLogout wiring (the host's
// own Navbar renders around this component via App.tsx), drop the outer
// full-viewport wrapper (host `<main>` already sets min-h-screen +
// bg-background + pt-16), keep the two-surface Mode-switch + Weekly
// Grid / TeamView split verbatim.

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, User, Users } from 'lucide-react'
import { ToastContainer, useToast } from './components/AuthToast'
import WeeklyGrid, { mondayOf } from './components/timetracker/WeeklyGrid'
import TimeEntryForm from './components/timetracker/TimeEntryForm'
import TeamView from './components/timetracker/TeamView'
import { getTeamMember } from './components/team/teamMembers'
import { TIME_ENTRIES, type TimeEntry, type DesignerId } from './data/timeEntries'
import { TODAY_ISO } from './data/projects'
import { getTaskType } from './data/taskTypes'
import { coachingCopy } from './data/coachingCopy'

type Mode = 'my-timesheet' | 'team-view'

export default function TimeTrackerApp() {
    const [mode, setMode] = useState<Mode>('my-timesheet')
    const [designerId] = useState<DesignerId>('me')
    const [weekMonday, setWeekMonday] = useState(() => mondayOf(TODAY_ISO))
    const [entries, setEntries] = useState<TimeEntry[]>(TIME_ENTRIES)
    const [formOpen, setFormOpen] = useState(false)
    const [formDate, setFormDate] = useState<string>(TODAY_ISO)
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
    const [formInitialDurationMin, setFormInitialDurationMin] = useState<number | undefined>()
    const [formInitialStartMin, setFormInitialStartMin] = useState<number | undefined>()
    const [summerFridays, setSummerFridays] = useState(false)
    const { toasts, addToast, dismissToast } = useToast()

    const handleAddEntry = (date: string, durationMinutes?: number, startMinutes?: number) => {
        setFormDate(date)
        setEditingEntry(null)
        setFormInitialDurationMin(durationMinutes)
        setFormInitialStartMin(startMinutes)
        setFormOpen(true)
    }
    const handleEditEntry = (e: TimeEntry) => {
        setFormDate(e.date)
        setEditingEntry(e)
        setFormOpen(true)
    }
    const handleSave = (draft: Omit<TimeEntry, 'id'>) => {
        if (editingEntry) {
            setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...editingEntry, ...draft } : e))
        } else {
            const newEntry: TimeEntry = { ...draft, id: `TE-NEW-${Date.now()}` }
            setEntries(prev => [...prev, newEntry])
        }
    }
    const handleDelete = (entryId: string) => {
        setEntries(prev => prev.filter(e => e.id !== entryId))
        addToast('info', 'Entry deleted')
    }
    const handleMoveEntry = (entryId: string, newDateIso: string, newStartMinutes: number) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, date: newDateIso, startMinutesFromMidnight: newStartMinutes } : e))
        addToast('success', `Moved to ${formatDayShort(newDateIso)}, ${formatTime(newStartMinutes)}`)
    }
    const handleResizeEntry = (entryId: string, newDurationMinutes: number) => {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, durationMinutes: newDurationMinutes } : e))
        addToast('info', `Duration updated to ${(newDurationMinutes / 60).toFixed(2).replace(/\.?0+$/, '')}h`)
    }
    const handleResetWeek = () => {
        const currentSunday = shiftMonday(weekMonday, 6)
        const before = entries.length
        setEntries(prev => prev.filter(e => !(e.designerId === designerId && e.date >= weekMonday && e.date <= currentSunday)))
        const removed = before - entries.filter(e => !(e.designerId === designerId && e.date >= weekMonday && e.date <= currentSunday)).length
        addToast('info', `Reset · ${removed} entr${removed === 1 ? 'y' : 'ies'} deleted for this week`)
    }
    const handleResetDay = (dateIso: string) => {
        const before = entries.filter(e => e.designerId === designerId && e.date === dateIso).length
        setEntries(prev => prev.filter(e => !(e.designerId === designerId && e.date === dateIso)))
        const label = new Date(dateIso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        addToast('info', `Reset · ${before} entr${before === 1 ? 'y' : 'ies'} deleted for ${label}`)
    }
    const handleCopyPreviousWeek = () => {
        const prevMonday = shiftMonday(weekMonday, -7)
        const prevSunday = shiftMonday(prevMonday, 6)
        const prev = entries.filter(e => e.designerId === designerId && e.date >= prevMonday && e.date <= prevSunday)
        const nonTimeOff = prev.filter(e => {
            const t = getTaskType(e.taskTypeId)
            return t?.group !== 'time-off'
        })
        if (nonTimeOff.length === 0) {
            addToast('info', 'No entries to copy from last week.')
            return
        }
        const currentSunday = shiftMonday(weekMonday, 6)
        const currentHas = entries.some(e => e.designerId === designerId && e.date >= weekMonday && e.date <= currentSunday)
        if (currentHas) {
            const confirmed = window.confirm(`This week already has entries. Copy last week's ${nonTimeOff.length} non-time-off entries anyway? (Existing entries will not be removed · duplicates may appear.)`)
            if (!confirmed) return
        }
        const timestamp = Date.now()
        const duplicated: TimeEntry[] = nonTimeOff.map((e, i) => ({
            ...e,
            id: `TE-COPY-${timestamp}-${i}`,
            date: shiftMonday(weekMonday, dayDelta(prevMonday, e.date)),
            deliverableComplete: false,
            deliverableSentAt: undefined,
        }))
        setEntries(prev => [...prev, ...duplicated])
        addToast('success', `Copied ${duplicated.length} entries from last week.`)
    }
    const handleDeliverableDispatched = (info: { entryId: string | null; projectId: string; salesRepName: string; timestampIso: string }) => {
        if (info.entryId) {
            setEntries(prev => prev.map(e => e.id === info.entryId ? { ...e, deliverableComplete: true, deliverableSentAt: info.timestampIso } : e))
        }
        addToast('success', coachingCopy.deliverableSent({
            salesRepName: info.salesRepName,
            projectName: '',
            undoWindowSeconds: 0,
        }))
    }

    const goPrevWeek = () => setWeekMonday(shiftMonday(weekMonday, -7))
    const goNextWeek = () => setWeekMonday(shiftMonday(weekMonday, 7))
    const goToday = () => setWeekMonday(mondayOf(TODAY_ISO))

    const currentWeekLabel = useMemo(() => formatMondayLabel(weekMonday), [weekMonday])
    const isCurrentWeek = weekMonday === mondayOf(TODAY_ISO)
    const alreadyCopiedThisWeek = useMemo(() => {
        const currentSunday = shiftMonday(weekMonday, 6)
        return entries.some(e => e.designerId === designerId && e.date >= weekMonday && e.date <= currentSunday && e.id.startsWith('TE-COPY-'))
    }, [entries, designerId, weekMonday])

    return (
        <div className="px-4 py-6 max-w-screen-2xl mx-auto space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                            <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">Time Tracker</h3>

                            <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
                                <ModeButton active={mode === 'my-timesheet'} onClick={() => setMode('my-timesheet')} icon={User} label="My Timesheet" />
                                <ModeButton active={mode === 'team-view'} onClick={() => setMode('team-view')} icon={Users} label="Team View" />
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                <button onClick={goPrevWeek} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Previous week">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="text-sm font-medium text-foreground min-w-[130px] text-center tabular-nums">
                                    {currentWeekLabel}
                                </div>
                                <button onClick={goNextWeek} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Next week">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={goToday}
                                    disabled={isCurrentWeek}
                                    className="ml-1 text-xs font-semibold text-foreground border border-input rounded-md px-2.5 py-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Today
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {mode === 'my-timesheet' ? (
                        <WeeklyGrid
                            designerId={designerId}
                            weekMondayIso={weekMonday}
                            allEntries={entries}
                            onAddEntry={handleAddEntry}
                            onEditEntry={handleEditEntry}
                            onMoveEntry={handleMoveEntry}
                            onResizeEntry={handleResizeEntry}
                            onDeleteEntry={handleDelete}
                            onCopyPreviousWeek={handleCopyPreviousWeek}
                            alreadyCopiedThisWeek={alreadyCopiedThisWeek}
                            summerFridays={summerFridays}
                            onToggleSummerFridays={setSummerFridays}
                            onResetWeek={handleResetWeek}
                            onResetDay={handleResetDay}
                            todayIso={TODAY_ISO}
                        />
                    ) : (
                        <TeamView
                            weekMondayIso={weekMonday}
                            allEntries={entries}
                            todayIso={TODAY_ISO}
                            summerFridaysActive={summerFridays}
                            onSendDigest={(designerIds) => {
                                const names = designerIds.map(id => getTeamMember(id)?.name?.split(' ')[0] ?? id)
                                addToast('success', `Friday digest sent to ${names.length} designer${names.length === 1 ? '' : 's'}: ${names.join(', ')}`)
                            }}
                            onSendCoachingMessage={(designerId, _entryId, message) => {
                                const person = getTeamMember(designerId)
                                const firstName = person?.name?.split(' ')[0] ?? designerId
                                const preview = message ? ` · "${message.slice(0, 40)}${message.length > 40 ? '…' : ''}"` : ''
                                addToast('success', `Check-in sent to ${firstName}${preview}`)
                            }}
                            onReportGenerated={(kind, message) => addToast(kind === 'error' ? 'error' : 'success', message)}
                        />
                    )}
                </div>
            </div>

            <TimeEntryForm
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                date={formDate}
                entry={editingEntry}
                allEntries={entries}
                onSave={handleSave}
                onDelete={handleDelete}
                onDeliverableDispatched={handleDeliverableDispatched}
                initialDurationMinutes={formInitialDurationMin}
                initialStartMinutes={formInitialStartMin}
                weekMondayIso={weekMonday}
                designerId={designerId}
                summerFridays={summerFridays}
            />

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}

function ModeButton({ active, onClick, icon: Icon, label, hint }: { active: boolean; onClick: () => void; icon: any; label: string; hint?: string }) {
    return (
        <button
            onClick={onClick}
            title={hint}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 outline-none ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    )
}

function shiftMonday(iso: string, days: number): string {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}
function dayDelta(a: string, b: string): number {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}
function formatMondayLabel(iso: string): string {
    const d = new Date(iso)
    const end = new Date(d); end.setDate(d.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${d.toLocaleDateString('en-US', opts)}–${end.getDate()}`
}
function formatDayShort(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}
