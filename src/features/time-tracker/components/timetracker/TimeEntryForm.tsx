// TT.1 · Diego 2026-09-03 · Time Entry Form.
// Composes the 4 atomic components + adds the save-state indicator +
// prompt-before-save (Timely pattern · never hard-block · pain #4).
// Cmd+Enter saves · Esc closes.

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Dialog, Transition, DialogPanel, TransitionChild } from '@headlessui/react'
import { X, Save, Clock, Palmtree, Umbrella, Thermometer, Minus, Plus, AlertTriangle } from 'lucide-react'
import ProjectSelector from './ProjectSelector'
import TaskTypeDropdown from './TaskTypeDropdown'
import CumulativeHoursInline from './CumulativeHoursInline'
import DeliverableCompleteCheckbox from './DeliverableCompleteCheckbox'
import { getTaskType, type CompletionState } from '../../data/taskTypes'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'

// TT.18 · sentinel para entries de time-off · el ProjectSelector se oculta,
// selectors downstream (cumulative, budget) filtran este id explícito.
const TIME_OFF_PROJECT_ID = 'INTERNAL-TIME-OFF'
import { coachingCopy } from '../../data/coachingCopy'
import type { TimeEntry } from '../../data/timeEntries'
import { projectCumulativeMinutes } from '../../data/timeEntries'
import { getProject } from '../../data/projects'

interface Props {
    isOpen: boolean
    onClose: () => void
    /** Pre-fill date · required · comes from the cell clicked in the grid. */
    date: string
    /** Existing entry to edit; new entry when null. */
    entry?: TimeEntry | null
    /** All entries (for cumulative math). */
    allEntries: TimeEntry[]
    /** Called on save · parent decides how to persist. */
    onSave: (entry: Omit<TimeEntry, 'id'>) => void
    onDelete?: (entryId: string) => void
    /** Called when the deliverable email actually fires (after undo window). */
    onDeliverableDispatched?: (info: { entryId: string | null; projectId: string; salesRepName: string; timestampIso: string }) => void
    // TT.2 · Diego 2026-09-03 · pre-fill duration + start time from drag-create.
    initialDurationMinutes?: number
    initialStartMinutes?: number
    // TT.25 · week context para el reminder de horas restantes semanal.
    weekMondayIso?: string
    designerId?: string
    summerFridays?: boolean
}

type SaveState = 'idle' | 'saving' | 'saved'

export default function TimeEntryForm({ isOpen, onClose, date, entry, allEntries, onSave, onDelete, onDeliverableDispatched, initialDurationMinutes, initialStartMinutes, weekMondayIso, designerId, summerFridays = false }: Props) {
    const isEdit = !!entry
    const [projectId, setProjectId] = useState<string | null>(entry?.projectId ?? null)
    const [taskTypeId, setTaskTypeId] = useState<string | null>(entry?.taskTypeId ?? null)
    const [completionState, setCompletionState] = useState<CompletionState | undefined>(entry?.completionState)
    const [memo, setMemo] = useState(entry?.memo ?? '')
    const [durationHHMM, setDurationHHMM] = useState(entry ? minutesToHHMM(entry.durationMinutes) : minutesToHHMM(initialDurationMinutes ?? 60))
    const [billable, setBillable] = useState(entry?.billable ?? true)
    const [deliverableComplete, setDeliverableComplete] = useState(entry?.deliverableComplete ?? false)
    // TT.12 · Diego 2026-09-03 · start time editable · viene del drag o
    // del entry existente · undefined = sin franja definida (auto-stack).
    const [startMin, setStartMin] = useState<number | undefined>(entry?.startMinutesFromMidnight ?? initialStartMinutes)
    const [saveState, setSaveState] = useState<SaveState>('idle')
    const [savedAt, setSavedAt] = useState<number | null>(null)
    const [savedSecondsAgo, setSavedSecondsAgo] = useState(0)
    const [showTaskTypePrompt, setShowTaskTypePrompt] = useState(false)
    // TT.45 · Diego 2026-09-09 · Timely-style prompt cuando el entry excede el
    // budget del project · benchmark:83 · NO hard-block · user decide.
    const [showBudgetPrompt, setShowBudgetPrompt] = useState(false)

    const draftMinutes = hhmmToMinutes(durationHHMM)
    const isTimeOff = getTaskType(taskTypeId)?.group === 'time-off'

    // TT.25 · Diego 2026-09-03 · reminder de horas restantes DE LA SEMANA
    // (antes era daily 8h · Diego pidió total). Capacity = 40h · 36h summer fri.
    const weeklyCapacityHours = summerFridays ? 36 : 40
    const activeDesignerId = designerId ?? entry?.designerId ?? 'me'
    const weekMon = weekMondayIso ?? mondayOf(date)
    const weekSun = addDaysIsoLocal(weekMon, 6)
    const hoursWeekLogged = useMemo(() => {
        const totalMin = allEntries
            .filter(e => e.designerId === activeDesignerId && e.date >= weekMon && e.date <= weekSun)
            .filter(e => !entry || e.id !== entry.id)   // excluir el entry en edit
            .reduce((sum, e) => sum + e.durationMinutes, 0)
        return totalMin / 60
    }, [allEntries, activeDesignerId, weekMon, weekSun, entry])
    const hoursWeekWithDraft = hoursWeekLogged + draftMinutes / 60
    const hoursRemaining = Math.max(0, weeklyCapacityHours - hoursWeekWithDraft)
    const isOverCapacity = hoursWeekWithDraft > weeklyCapacityHours + 0.01
    const overageHours = hoursWeekWithDraft - weeklyCapacityHours

    // TT.47.1 · Diego 2026-09-09 · project over-budget state · shows warning
    // inline entre grid y footer cuando este entry empuja al proyecto past
    // the plan · aligned con Bundle A wording del CumulativeHoursInline.
    const currentProject = projectId && projectId !== TIME_OFF_PROJECT_ID ? getProject(projectId) : null
    const projectBudgetInfo = useMemo(() => {
        if (!currentProject) return null
        const cumulativeMin = projectCumulativeMinutes(currentProject.id, allEntries)
        const totalHoursAfter = (cumulativeMin + draftMinutes) / 60
        const overBudget = totalHoursAfter > currentProject.budgetHours
        const overHours = totalHoursAfter - currentProject.budgetHours
        return { overBudget, overHours, totalHoursAfter, budgetHours: currentProject.budgetHours, projectName: currentProject.name }
    }, [currentProject, allEntries, draftMinutes])

    // TT.18 · quick-pick time off · auto-set task + duration + sentinel project.
    // Aplica solo a new entries · en edit el user modifica desde el dropdown.
    const pickTimeOff = (id: 'holiday' | 'pto' | 'sick') => {
        setTaskTypeId(id)
        setBillable(false)
        setDurationHHMM('8:00')
        setProjectId(TIME_OFF_PROJECT_ID)
        setDeliverableComplete(false)
    }

    // Re-init when opened w/ a different entry
    useEffect(() => {
        if (!isOpen) return
        setProjectId(entry?.projectId ?? null)
        setTaskTypeId(entry?.taskTypeId ?? null)
        setCompletionState(entry?.completionState)
        setMemo(entry?.memo ?? '')
        setDurationHHMM(entry ? minutesToHHMM(entry.durationMinutes) : minutesToHHMM(initialDurationMinutes ?? 60))
        setBillable(entry?.billable ?? true)
        setDeliverableComplete(entry?.deliverableComplete ?? false)
        setStartMin(entry?.startMinutesFromMidnight ?? initialStartMinutes)
        setSaveState('idle')
        setSavedAt(null)
        setShowTaskTypePrompt(false)
        setShowBudgetPrompt(false)
    }, [isOpen, entry?.id, initialDurationMinutes, initialStartMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

    // Live "Saved Xs ago" ticker.
    useEffect(() => {
        if (saveState !== 'saved' || !savedAt) return
        const iv = window.setInterval(() => {
            setSavedSecondsAgo(Math.max(0, Math.floor((Date.now() - savedAt) / 1000)))
        }, 1000)
        return () => window.clearInterval(iv)
    }, [saveState, savedAt])

    // Task-type default billable when picked (respect explicit override).
    // TT.5 · Diego 2026-09-03 · Holiday/PTO/Sick auto-fill duration a 8h
    // (doc lit: "Holidays se loguean como 8h internal" sot.md:90).
    // McKinley: "no quiero que tengan que log-on just to log holiday hours".
    // Solo aplica en new entry para no sobrescribir edits del user.
    useEffect(() => {
        const t = getTaskType(taskTypeId)
        if (!t || entry) return
        setBillable(t.defaultBillable)
        // Auto-fill 8h for time-off types (holiday, PTO, sick) on new entries.
        if (t.group === 'time-off') {
            setDurationHHMM('8:00')
            // TT.18 · auto-select sentinel project · skip el ProjectSelector.
            setProjectId(TIME_OFF_PROJECT_ID)
        }
    }, [taskTypeId, entry])

    // Keyboard shortcuts (Cmd+Enter save, Esc close).
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); tryToSave() }
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, projectId, taskTypeId, memo, durationHHMM, billable, deliverableComplete]) // eslint-disable-line react-hooks/exhaustive-deps

    const canSave = !!projectId && draftMinutes > 0

    const tryToSave = () => {
        if (!canSave) return
        // Prompt-before-submit (Timely pattern) if task type is empty.
        if (!taskTypeId && !showTaskTypePrompt) {
            setShowTaskTypePrompt(true)
            return
        }
        // TT.45 · budget prompt · si este entry excede el budget del project
        // y el user tiene billable marcado, ofrece marcarlo como internal.
        // NO hard-block (benchmark:83) · user puede confirmar billable si quiere.
        if (projectBudgetInfo?.overBudget && billable && !showBudgetPrompt) {
            setShowBudgetPrompt(true)
            return
        }
        doSave()
    }

    const doSave = (overrideBillable?: boolean) => {
        if (!projectId) return
        setSaveState('saving')
        const finalBillable = overrideBillable !== undefined ? overrideBillable : billable
        window.setTimeout(() => {
            onSave({
                designerId: entry?.designerId ?? 'me',
                date,
                projectId,
                taskTypeId: taskTypeId ?? 'admin',
                completionState,
                memo,
                durationMinutes: draftMinutes,
                billable: finalBillable,
                deliverableComplete,
                deliverableSentAt: undefined,
                // TT.2 · preserve existing start (edit) or use drag-create pre-fill.
                // TT.12 · usar el startMin editado (state) · fallback al entry o al drag.
                startMinutesFromMidnight: startMin ?? entry?.startMinutesFromMidnight ?? initialStartMinutes,
            })
            setSaveState('saved')
            setSavedAt(Date.now())
            setSavedSecondsAgo(0)
            // TT.19 · Diego 2026-09-03 · cerrar modal al save exitoso.
            // El toast externo confirma la acción · antes había que cerrar manual.
            onClose()
        }, 350) // simulated latency
    }

    const saveStateLabel = useMemo(() => {
        if (saveState === 'idle') return coachingCopy.saveStateIdle()
        if (saveState === 'saving') return coachingCopy.saveStateSaving()
        return coachingCopy.saveStateSaved(savedSecondsAgo)
    }, [saveState, savedSecondsAgo])

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-md" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 pt-12">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-260" enterFrom="opacity-0 translate-y-2 scale-[0.995]" enterTo="opacity-100 translate-y-0 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.995]"
                        >
                            {/* TT.47 · modal responsive · 960/1080px en desktop para
                                aprovechar el ancho + layout 2-col en lg+ · el body
                                scrollable solo se activa en viewports chicos.
                                Antes (TT.23) 720px fijo · Save requería scroll con
                                muchos fields. */}
                            {/* TT.51 · Diego 2026-09-08 · más altura al modal · max-h de calc(100vh-6rem)
                                 → calc(100vh-2rem) · antes el ProjectSelector dropdown se veía cortado
                                 cuando había poco espacio · ahora con portal (fixed) + más altura del
                                 modal se resuelve ambos vectores. */}
                            <DialogPanel className="w-full max-w-[720px] lg:max-w-[960px] xl:max-w-[1080px] max-h-[calc(100vh-2rem)] rounded-2xl bg-card border border-border shadow-lg overflow-hidden flex flex-col">
                                {/* Header · sticky · TT.25 · title y chip alineados en 1 row
                                    baseline · chip usa horas semanales restantes (total, no daily). */}
                                <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0 gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time entry</div>
                                        <div className="flex items-baseline gap-3 flex-wrap">
                                            <h3 className="text-base font-semibold text-foreground truncate">{formatDateLong(date)}</h3>
                                            <span
                                                className={`inline-flex items-baseline gap-1.5 text-xs font-medium tabular-nums px-2.5 py-1 rounded-full border shrink-0 ${
                                                    isOverCapacity ? 'bg-destructive-soft border-destructive/40 text-destructive' :
                                                    hoursRemaining <= 4 ? 'bg-warning-soft border-warning/40 text-warning' :
                                                    'bg-success-soft border-success/40 text-success'
                                                }`}
                                                title={`${hoursWeekLogged.toFixed(1)}h logueadas esta semana + ${(draftMinutes / 60).toFixed(2)}h este entry · capacidad semanal ${weeklyCapacityHours}h${summerFridays ? ' (summer)' : ''}`}
                                            >
                                                {isOverCapacity ? (
                                                    <>+{overageHours.toFixed(1)}h <span className="font-normal opacity-80">over {weeklyCapacityHours}h week</span></>
                                                ) : (
                                                    <>{hoursRemaining.toFixed(1)}h <span className="font-normal opacity-80">left of {weeklyCapacityHours}h week</span></>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" aria-label="Close">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Body · scrollable en viewports chicos · TT.47 grid 2-col en lg+ */}
                                <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                                    {/* TT.18 · quick-picks time off · Holiday / PTO / Sick.
                                        Solo en new entries · auto-fills task + 8h + sentinel project.
                                        Hide durante edit (el user usa el dropdown de task type). */}
                                    {!isEdit && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick log</span>
                                            <button
                                                type="button"
                                                onClick={() => pickTimeOff('holiday')}
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 transition-colors ${taskTypeId === 'holiday' ? 'bg-warning-soft border-warning text-foreground' : 'border-input text-foreground hover:bg-muted'}`}
                                                title="Log 8h holiday · fills task + duration + skips project"
                                            >
                                                <Palmtree className="h-3 w-3" />
                                                Holiday
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => pickTimeOff('pto')}
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 transition-colors ${taskTypeId === 'pto' ? 'bg-info-soft border-info text-foreground' : 'border-input text-foreground hover:bg-muted'}`}
                                                title="Log 8h PTO · fills task + duration + skips project"
                                            >
                                                <Umbrella className="h-3 w-3" />
                                                PTO
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => pickTimeOff('sick')}
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 transition-colors ${taskTypeId === 'sick' ? 'bg-destructive-soft border-destructive text-foreground' : 'border-input text-foreground hover:bg-muted'}`}
                                                title="Log 8h sick · fills task + duration + skips project"
                                            >
                                                <Thermometer className="h-3 w-3" />
                                                Sick
                                            </button>
                                            {isTimeOff && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setTaskTypeId(null); setProjectId(null); setDurationHHMM('1:00'); setBillable(true) }}
                                                    className="ml-auto text-[11px] text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
                                                >
                                                    Clear · log a regular entry
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* TT.47 · Grid 2-col · Col 1 = WHEN + WHAT PROJECT ·
                                        Col 2 = TASK + NOTES + DELIVERABLE. En <lg cae a 1 col.
                                        TT.47.1 · gap aumentado + divider vertical entre cols
                                        para marcar mejor la separación (feedback tech lead). */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:divide-x lg:divide-border">
                                        {/* ─── COL 1 · identification ─── */}
                                        <div className="space-y-4 lg:pr-2">
                                            {/* Time range · TT.12 */}
                                            {startMin !== undefined ? (
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Time range</label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <TimeStepper
                                                            value={startMin}
                                                            onChange={setStartMin}
                                                            ariaLabel="Start time"
                                                        />
                                                        <span className="text-xs text-muted-foreground px-1">to</span>
                                                        <TimeStepper
                                                            value={startMin + draftMinutes}
                                                            onChange={(newEnd) => {
                                                                const newDuration = Math.max(15, newEnd - startMin)
                                                                setDurationHHMM(minutesToHHMM(Math.round(newDuration / 15) * 15))
                                                            }}
                                                            ariaLabel="End time"
                                                        />
                                                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{durationHHMM} h</span>
                                                        <div className="ml-auto pl-2 border-l border-border">
                                                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                                <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="h-4 w-4 accent-success" />
                                                                Billable
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <p className="mt-1.5 text-[11px] text-muted-foreground">Type 8am / 20:15 · ↑↓ arrows or ± buttons for 15-min steps</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Duration</label>
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                value={durationHHMM}
                                                                onChange={(e) => setDurationHHMM(e.target.value)}
                                                                placeholder="1:00"
                                                                className="w-24 text-lg tabular-nums font-semibold"
                                                            />
                                                            <span className="text-xs text-muted-foreground">hh:mm · 15-min steps</span>
                                                        </div>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                        <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="h-4 w-4 accent-success" />
                                                        Billable
                                                    </label>
                                                </div>
                                            )}

                                            {/* Project + Cumulative · TT.18 hide en time-off */}
                                            {!isTimeOff && (
                                                <>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Project</label>
                                                        <ProjectSelector value={projectId === TIME_OFF_PROJECT_ID ? null : projectId} onChange={setProjectId} />
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                                                        <CumulativeHoursInline projectId={projectId === TIME_OFF_PROJECT_ID ? null : projectId} draftDurationMinutes={draftMinutes} entries={allEntries} />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* ─── COL 2 · context / narrative + deliverable ─── */}
                                        <div className="space-y-4 lg:pl-8">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                    Task type
                                                    <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                                                        (helps team spot trends · optional)
                                                    </span>
                                                </label>
                                                <TaskTypeDropdown value={taskTypeId} completionState={completionState} onChange={(id, cs) => { setTaskTypeId(id); setCompletionState(cs) }} />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Memo</label>
                                                <Textarea
                                                    value={memo}
                                                    onChange={(e) => setMemo(e.target.value)}
                                                    rows={3}
                                                    placeholder="What did you work on?"
                                                />
                                            </div>

                                            {/* TT.47.1 · Deliverable movido a col 2 (antes full-width) ·
                                                sigue oculto en time-off como antes. */}
                                            {!isTimeOff && (
                                                <DeliverableCompleteCheckbox
                                                    checked={deliverableComplete}
                                                    onChange={setDeliverableComplete}
                                                    projectId={projectId === TIME_OFF_PROJECT_ID ? null : projectId}
                                                    onDispatched={(info) => onDeliverableDispatched?.({ entryId: entry?.id ?? null, ...info })}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* TT.47.1 · Warning inline cuando este entry empuja al project
                                        past the plan (Bundle A wording). Non-blocking coaching signal
                                        alineado con el spirit doc (benchmark:83 · prompt-before-save
                                        NO hard-block · McKinley: 'add hours to next quote or change order'). */}
                                    {projectBudgetInfo?.overBudget && billable && (
                                        <div className="rounded-lg border border-destructive/40 bg-destructive-soft p-3 flex items-start gap-3">
                                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                            <div className="flex-1 text-sm text-foreground">
                                                <p className="font-medium">
                                                    This entry pushes <span className="font-semibold">{projectBudgetInfo.projectName}</span> past the plan · +{projectBudgetInfo.overHours.toFixed(1)}h over the {projectBudgetInfo.budgetHours}h scoped.
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Consider marking as internal (uncheck Billable) or logging the excess in a change order.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Prompt-before-save · task type missing */}
                                    {showTaskTypePrompt && (
                                        <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 space-y-2">
                                            <p className="text-sm text-foreground">{coachingCopy.promptTaskTypeMissing()}</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <button type="button" onClick={() => setShowTaskTypePrompt(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
                                                    Add task type
                                                </button>
                                                <button type="button" onClick={() => doSave()} className="text-xs font-semibold text-foreground bg-warning/20 hover:bg-warning/30 px-3 py-1.5 rounded-md transition-colors">
                                                    Save anyway
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* TT.45 · Prompt-before-save · budget cap (Timely pattern).
                                        Aparece cuando el entry excede el budget del project + billable
                                        está checked · offer 3 acciones: keep billable, log as internal,
                                        or cancel. Alineado con doc benchmark:83 (NO hard-block) +
                                        transcript McKinley (analysis:38 · 'add hours to next quote or
                                        change order'). */}
                                    {showBudgetPrompt && projectBudgetInfo && (
                                        <div className="rounded-lg border border-destructive/40 bg-destructive-soft p-3 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-foreground">
                                                        This entry will push <span className="font-semibold">{projectBudgetInfo.projectName}</span> +{projectBudgetInfo.overHours.toFixed(1)}h over the {projectBudgetInfo.budgetHours}h plan.
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Log the excess as <strong>internal</strong> (non-billable), keep it <strong>billable</strong> and coordinate a change order with the sales rep, or cancel and adjust.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBudgetPrompt(false)}
                                                    className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setBillable(false); setShowBudgetPrompt(false); doSave(false) }}
                                                    className="text-xs font-semibold text-foreground bg-background border border-input hover:bg-muted px-3 py-1.5 rounded-md transition-colors"
                                                    title="Uncheck Billable and save · excess treated as internal"
                                                >
                                                    Log excess as internal
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowBudgetPrompt(false); doSave(true) }}
                                                    className="text-xs font-semibold text-destructive-foreground bg-destructive hover:bg-destructive/90 px-3 py-1.5 rounded-md transition-colors"
                                                    title="Keep this entry billable · plan a change order with the sales rep"
                                                >
                                                    Keep billable
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border bg-muted/30 shrink-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className={`h-1.5 w-1.5 rounded-full ${saveState === 'saved' ? 'bg-success' : saveState === 'saving' ? 'bg-warning animate-pulse' : 'bg-muted-foreground/40'}`} />
                                        <span className="tabular-nums">{saveStateLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEdit && onDelete && entry && (
                                            <button type="button" onClick={() => { onDelete(entry.id); onClose() }} className="text-xs font-medium text-destructive hover:bg-destructive-soft px-3 py-2 rounded-md transition-colors">
                                                Delete
                                            </button>
                                        )}
                                        <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={tryToSave}
                                            disabled={!canSave || saveState === 'saving'}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isEdit ? 'Update' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

// Helpers -----------------------------------------------------
function hhmmToMinutes(s: string): number {
    const [h = '0', m = '0'] = s.split(':')
    const hn = parseInt(h, 10) || 0
    const mn = parseInt(m, 10) || 0
    const total = hn * 60 + mn
    return Math.max(0, Math.round(total / 15) * 15)
}
function minutesToHHMM(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}:${m.toString().padStart(2, '0')}`
}
function formatDateLong(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
// TT.25 · fallback week math cuando el parent no pasa weekMondayIso.
function mondayOf(iso: string): string {
    const d = new Date(iso + 'T00:00:00')
    const dow = d.getDay()                       // 0=Sun..6=Sat
    const offset = dow === 0 ? -6 : 1 - dow      // Sun → -6 · Mon → 0
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
}
function addDaysIsoLocal(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
}
// TT.12 · <input type="time"> value ↔ minutes-from-midnight.
function minutesToTimeInput(min: number): string {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, min))
    const h = Math.floor(clamped / 60)
    const m = clamped % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
function timeInputToMinutes(v: string): number | null {
    const [hStr, mStr] = v.split(':')
    if (!hStr || !mStr) return null
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (isNaN(h) || isNaN(m)) return null
    return h * 60 + m
}

// TT.21 · Diego 2026-09-03 · TimeStepper · reemplaza <input type="time"> con:
// - text input flexible (acepta '8', '8:30', '8am', '8:30 PM', '20:15')
// - botones ± para 15-min steps
// - Arrow up/down keys para 15-min · Shift+Arrow para 1h
// - display en formato AM/PM (consistente con time axis)
// - blur = commit + normalize · Escape = revert.
function TimeStepper({ value, onChange, ariaLabel }: { value: number; onChange: (min: number) => void; ariaLabel: string }) {
    const [draft, setDraft] = useState(formatDisplay(value))
    const [focused, setFocused] = useState(false)

    // Sync desde el prop (drag externo, sibling change) solo cuando el user no está editando.
    useEffect(() => { if (!focused) setDraft(formatDisplay(value)) }, [value, focused])

    const commit = (v: number) => onChange(Math.max(0, Math.min(24 * 60 - 15, v)))

    const parseAndCommit = () => {
        const parsed = parseFlexibleTime(draft)
        if (parsed !== null) {
            const snapped = Math.round(parsed / 15) * 15
            commit(snapped)
            setDraft(formatDisplay(snapped))
        } else {
            setDraft(formatDisplay(value)) // revert
        }
    }

    return (
        <div className="inline-flex items-stretch rounded-lg border border-input bg-input-background/30 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40 transition-colors">
            <button
                type="button"
                onClick={() => commit(value - 15)}
                className="px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-lg transition-colors border-r border-border/60"
                title="Back 15 min"
                aria-label="Decrease time by 15 minutes"
            >
                <Minus className="h-3 w-3" />
            </button>
            <input
                type="text"
                inputMode="numeric"
                value={draft}
                onFocus={(e) => { setFocused(true); e.target.select() }}
                onBlur={() => { setFocused(false); parseAndCommit() }}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); commit(value + (e.shiftKey ? 60 : 15)) }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); commit(value - (e.shiftKey ? 60 : 15)) }
                    else if (e.key === 'Enter') { e.preventDefault(); parseAndCommit(); (e.target as HTMLInputElement).blur() }
                    else if (e.key === 'Escape') { setDraft(formatDisplay(value)); (e.target as HTMLInputElement).blur() }
                }}
                className="w-[74px] px-2 py-1.5 text-sm tabular-nums font-semibold bg-transparent text-foreground text-center focus:outline-none"
                aria-label={ariaLabel}
                placeholder="8:00 AM"
            />
            <button
                type="button"
                onClick={() => commit(value + 15)}
                className="px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-r-lg transition-colors border-l border-border/60"
                title="Forward 15 min"
                aria-label="Increase time by 15 minutes"
            >
                <Plus className="h-3 w-3" />
            </button>
        </div>
    )
}

/** Format minutes-from-midnight as "8:00 AM". */
function formatDisplay(min: number): string {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, min))
    const h = Math.floor(clamped / 60)
    const m = clamped % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

/** Parse flexible time input · returns minutes-from-midnight or null.
 *  Accepts: '8', '8:30', '830', '8am', '8pm', '8:30 AM', '20:15', '8.30'.
 */
function parseFlexibleTime(input: string): number | null {
    const s = input.trim().toLowerCase().replace(/\s+/g, '')
    if (!s) return null
    // Detect am/pm suffix
    let ampm: 'am' | 'pm' | null = null
    let core = s
    if (s.endsWith('am')) { ampm = 'am'; core = s.slice(0, -2) }
    else if (s.endsWith('pm')) { ampm = 'pm'; core = s.slice(0, -2) }
    else if (s.endsWith('a')) { ampm = 'am'; core = s.slice(0, -1) }
    else if (s.endsWith('p')) { ampm = 'pm'; core = s.slice(0, -1) }
    core = core.replace(/[.\s]/g, ':').trim()
    let h: number
    let m: number
    if (core.includes(':')) {
        const [hStr, mStr = '0'] = core.split(':')
        h = parseInt(hStr, 10); m = parseInt(mStr, 10)
    } else if (/^\d{3,4}$/.test(core)) {
        // '830' → 8:30 · '1215' → 12:15
        const cutoff = core.length - 2
        h = parseInt(core.slice(0, cutoff), 10); m = parseInt(core.slice(cutoff), 10)
    } else if (/^\d{1,2}$/.test(core)) {
        h = parseInt(core, 10); m = 0
    } else {
        return null
    }
    if (isNaN(h) || isNaN(m) || m < 0 || m > 59 || h < 0 || h > 23) return null
    if (ampm === 'am') { if (h === 12) h = 0 }
    else if (ampm === 'pm') { if (h < 12) h += 12 }
    // Sin ampm: si h en 1..7 asumimos PM (rango extended-hours coincide más con evening)?
    // Mejor no · dejar como 24h literal para no adivinar mal.
    return h * 60 + m
}
