// TT.2 · Diego 2026-09-03 · WeeklyGrid rewrite · Google Calendar-style
// week view. Time-axis vertical (7am-7pm · 15-min slots) + 7 day cols
// + absolutely-positioned entry blocks + drag-to-create, drag-to-move,
// drag-to-resize. Skills applied: ux-heuristics + minimalist-ui +
// refactoring-ui. See plan file for full analysis + references.
//
// Interactions:
//   - Click empty area on day col → drag downward → ghost block →
//     release → TimeEntryForm opens pre-filled with date + duration +
//     startMinutes.
//   - Click existing entry → edit (opens form).
//   - Drag existing entry → move to new time/day (snap 15 min).
//   - Drag bottom edge of entry → resize duration (snap 15 min).
//   - Current-time indicator (red line) on today's column.
//
// No external DnD lib · custom Pointer Events API handlers.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, Palette, Users, Wrench, Sun, PenTool, Presentation, Boxes, FileText, Coffee, Sunrise, RotateCcw, Trash2 } from 'lucide-react'
import { getProject } from '../../data/projects'
import { getTaskType, formatTaskLabel } from '../../data/taskTypes'
import {
    entriesForDesignerRange,
    DESIGNER_CAPACITY_HOURS,
    sumHours,
    CALENDAR_DAY_START_HOUR,
    CALENDAR_DAY_END_HOUR,
    EXTENDED_DAY_START_HOUR,
    EXTENDED_DAY_END_HOUR,
    CELL_HEIGHT_PX,
    MINUTES_PER_SLOT,
    formatTimeOfDay,
    formatTimeOfDayShort,
    type TimeEntry,
    type DesignerId,
} from '../../data/timeEntries'

interface Props {
    designerId: DesignerId
    weekMondayIso: string
    allEntries: TimeEntry[]
    onAddEntry: (dateIso: string, durationMinutes: number, startMinutes: number) => void
    onEditEntry: (entry: TimeEntry) => void
    onMoveEntry?: (entryId: string, newDateIso: string, newStartMinutes: number) => void
    onResizeEntry?: (entryId: string, newDurationMinutes: number) => void
    // TT.9 · delete inline sin abrir el TimeEntryForm.
    onDeleteEntry?: (entryId: string) => void
    // TT.5 · copy last week's entries into current week (Harvest pattern).
    onCopyPreviousWeek?: () => void
    // TT.9 · true si ya se hizo copy en esta semana · disable button para
    // evitar duplicación accidental (Diego reportó doble-click issue).
    alreadyCopiedThisWeek?: boolean
    // TT.5 · summer-Fridays capacity adjustment (-4h/week when active).
    summerFridays?: boolean
    onToggleSummerFridays?: (on: boolean) => void
    // TT.9 · reset controls · borra entries del designer para la week o day.
    onResetWeek?: () => void
    onResetDay?: (dateIso: string) => void
    todayIso: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// TT.5 · Diego 2026-09-03 · start/end minutes ahora dinámicos según toggle
// "Extended hours". Default 7am-7pm · extended 5am-11pm. Doc explicita
// permite cualquier hora · el toggle mantiene el UI limpio por default.
const HOUR_HEIGHT = CELL_HEIGHT_PX * 4 // 4 × 15-min = 1 hour = 48px

// TT.3 · Diego 2026-09-03 · task-type icon map. Reconocibilidad visual
// aún cuando el block está comprimido por overlap (only icon + duration
// visible when width < 100px). Lucide icons · size scales por block height.
const TASK_ICON_BY_ID: Record<string, React.ComponentType<{ className?: string }>> = {
    'block-plan': Boxes,
    'floor-plan': Boxes,
    'powerpoint': Presentation,
    'renderings': Palette,
    'spec-sheets': FileText,
    'client-review': FileText,
    'site-visit': PenTool,
    'kickoff': Users,
    'internal-mtg': Users,
    'client-mtg': Users,
    'training': Wrench,
    'onboarding': Wrench,
    'admin': Wrench,
    'downtime': Coffee,
    'holiday': Sun,
    'pto': Sun,
    'sick': Sun,
}
function getTaskIcon(taskTypeId: string): React.ComponentType<{ className?: string }> {
    return TASK_ICON_BY_ID[taskTypeId] ?? FileText
}

// TT.3 · Deterministic project color · hashed to a stable HSL hue.
// Rendered as a 4-pixel left rail on each entry block for at-a-glance
// project recognition (vs. only task-type distinction). No hex hardcoded ·
// uses CSS `hsl()` w/ soft saturation so it composes with any theme.
function getProjectHue(projectId: string): number {
    let hash = 0
    for (let i = 0; i < projectId.length; i++) hash = ((hash << 5) - hash + projectId.charCodeAt(i)) | 0
    return Math.abs(hash) % 360
}

type DragState =
    | { kind: 'idle' }
    | { kind: 'create'; dayIndex: number; startMin: number; currentMin: number }
    | { kind: 'move'; entryId: string; originDayIndex: number; originStartMin: number; grabOffsetMin: number; currentDayIndex: number; currentStartMin: number }
    | { kind: 'resize'; entryId: string; originDurationMin: number; currentDurationMin: number; dayIndex: number; startMin: number }

interface PositionedEntry extends TimeEntry {
    /** Start minutes (resolved · uses field or auto-stacked). */
    resolvedStart: number
    /** Column index (0..colCount-1) inside overlap group. */
    colIndex: number
    /** Total columns in the overlap group. */
    colCount: number
}

export default function WeeklyGrid({
    designerId, weekMondayIso, allEntries, onAddEntry, onEditEntry, onMoveEntry, onResizeEntry,
    onDeleteEntry, onCopyPreviousWeek, alreadyCopiedThisWeek = false,
    summerFridays = false, onToggleSummerFridays,
    onResetWeek, onResetDay, todayIso,
}: Props) {
    const gridRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [dragState, setDragState] = useState<DragState>({ kind: 'idle' })
    const [nowMinutes, setNowMinutes] = useState(getCurrentMinutes())
    // TT.5 · toggle Extended hours (5am-11pm) vs Default (7am-7pm).
    const [showExtended, setShowExtended] = useState(false)

    // TT.8 · Diego 2026-09-03 · toggle Extended ahora también revela
    // weekend (Sat/Sun). Doc `sot.md:67` permite weekend logging pero
    // `transcript:109` McKinley: "I'm not going to tell them on Saturday
    // they need to go in" → weekend es excepción, no default. Default
    // My Timesheet = Mon-Fri (5-day) + 7am-7pm · Extended = 7-day (Mon-Sun)
    // + 5am-11pm. Team View mantiene 7-day siempre (necesita overtime).
    const startHour = showExtended ? EXTENDED_DAY_START_HOUR : CALENDAR_DAY_START_HOUR
    const endHour = showExtended ? EXTENDED_DAY_END_HOUR : CALENDAR_DAY_END_HOUR
    const dayStartMin = startHour * 60
    const dayEndMin = endHour * 60
    const totalMinutes = dayEndMin - dayStartMin
    const totalHeight = (totalMinutes / MINUTES_PER_SLOT) * CELL_HEIGHT_PX
    const dayCount = showExtended ? 7 : 5

    // Refresh current-time indicator every 60s
    useEffect(() => {
        const t = window.setInterval(() => setNowMinutes(getCurrentMinutes()), 60_000)
        return () => window.clearInterval(t)
    }, [])

    // TT.8 · full week array siempre (para totals + navigation), slice
    // por dayCount solo en el render del grid.
    const week = useMemo(
        () => Array.from({ length: 7 }).map((_, i) => addDaysIso(weekMondayIso, i)),
        [weekMondayIso]
    )
    const visibleDays = useMemo(() => week.slice(0, dayCount), [week, dayCount])

    // Totals summary uses full week (weekend entries still count toward
    // capacity · summer Fridays y overtime).
    const weekEntries = useMemo(
        () => entriesForDesignerRange(designerId, week[0], week[6], allEntries),
        [designerId, week, allEntries]
    )

    // TT.34 · Diego 2026-09-03 · filtrar entries que caigan fuera del
    // rango visible (< dayStartMin o >= dayEndMin) para que no se rendericen
    // encima del sticky header o abajo del footer. Los entries early (ej.
    // 6:30 AM · timezone offset) solo aparecen en Extended mode (24h range).
    const positionedByDay = useMemo(() => {
        return visibleDays.map(dateIso => {
            const dayEntries = weekEntries.filter(e => {
                if (e.date !== dateIso) return false
                const startMin = e.startMinutesFromMidnight ?? dayStartMin
                const endMin = startMin + e.durationMinutes
                return endMin > dayStartMin && startMin < dayEndMin
            })
            return positionDay(dayEntries)
        })
    }, [visibleDays, weekEntries, dayStartMin, dayEndMin])

    // TT.34 · detect si hay entries fuera del rango visible · hint para
    // sugerir al user que active Extended mode.
    const hiddenEntriesCount = useMemo(() => {
        if (showExtended) return 0
        return weekEntries.filter(e => {
            const startMin = e.startMinutesFromMidnight ?? dayStartMin
            const endMin = startMin + e.durationMinutes
            return endMin <= dayStartMin || startMin >= dayEndMin
        }).length
    }, [weekEntries, dayStartMin, dayEndMin, showExtended])

    // Totals (unchanged from TT.1 pattern)
    const totalHours = sumHours(weekEntries)
    const billableHours = sumHours(weekEntries.filter(e => e.billable))
    const internalHours = sumHours(weekEntries.filter(e => !e.billable))
    // TT.5 · capacity respects summer-Fridays (-4h/week when active).
    const baseCapacity = DESIGNER_CAPACITY_HOURS[designerId] ?? 40
    const capacity = summerFridays ? Math.max(0, baseCapacity - 4) : baseCapacity
    const pct = Math.round((totalHours / capacity) * 100)

    // TT.29 · Diego 2026-09-03 · hour labels adaptivos al rango activo
    // (antes hardcoded CALENDAR · en Extended solo aparecían 7-19 aunque
    // el grid rendereaba hasta 11pm/12am).
    const hourLabels = useMemo(() => {
        const out: number[] = []
        for (let h = startHour; h <= endHour; h++) out.push(h)
        return out
    }, [startHour, endHour])

    // Convert absolute Y (relative to day col) → snapped minutes
    const yToMinutes = useCallback((y: number): number => {
        const rawMin = dayStartMin + (y / CELL_HEIGHT_PX) * MINUTES_PER_SLOT
        const snapped = Math.round(rawMin / MINUTES_PER_SLOT) * MINUTES_PER_SLOT
        return Math.max(dayStartMin, Math.min(dayEndMin, snapped))
    }, [])

    // Locate day column at pointer X (returns index 0..6 or null)
    const xToDayIndex = useCallback((clientX: number): number | null => {
        const grid = gridRef.current
        if (!grid) return null
        const cols = grid.querySelectorAll('[data-day-index]')
        for (const col of Array.from(cols) as HTMLElement[]) {
            const rect = col.getBoundingClientRect()
            if (clientX >= rect.left && clientX < rect.right) {
                return parseInt(col.dataset.dayIndex ?? '-1', 10)
            }
        }
        return null
    }, [])

    // === Drag: CREATE ===
    const onColPointerDown = (e: React.PointerEvent<HTMLDivElement>, dayIndex: number) => {
        // Ignore if clicked on an existing entry (bubbling won't happen because entries handle their own).
        if ((e.target as HTMLElement).closest('[data-entry-id]')) return
        if (e.button !== 0) return
        const col = e.currentTarget as HTMLElement
        const rect = col.getBoundingClientRect()
        const yLocal = e.clientY - rect.top
        const startMin = yToMinutes(yLocal)
        setDragState({ kind: 'create', dayIndex, startMin, currentMin: startMin + MINUTES_PER_SLOT })
        col.setPointerCapture(e.pointerId)
    }
    const onColPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragState.kind !== 'create') return
        const col = e.currentTarget as HTMLElement
        const rect = col.getBoundingClientRect()
        const yLocal = e.clientY - rect.top
        const currentMin = Math.max(dragState.startMin + MINUTES_PER_SLOT, yToMinutes(yLocal))
        setDragState({ ...dragState, currentMin })
    }
    const onColPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragState.kind !== 'create') return
        const col = e.currentTarget as HTMLElement
        col.releasePointerCapture(e.pointerId)
        const durationMinutes = dragState.currentMin - dragState.startMin
        if (durationMinutes >= MINUTES_PER_SLOT) {
            onAddEntry(week[dragState.dayIndex], durationMinutes, dragState.startMin)
        }
        setDragState({ kind: 'idle' })
    }

    // === Drag: MOVE + RESIZE ===
    // Uses window-level listeners so the drag survives leaving the block.
    useEffect(() => {
        if (dragState.kind !== 'move' && dragState.kind !== 'resize') return
        const onMove = (e: PointerEvent) => {
            if (dragState.kind === 'move') {
                const dayIdx = xToDayIndex(e.clientX)
                const grid = gridRef.current
                if (!grid || dayIdx == null) return
                const col = grid.querySelector(`[data-day-index="${dayIdx}"]`) as HTMLElement | null
                if (!col) return
                const rect = col.getBoundingClientRect()
                const yLocal = e.clientY - rect.top
                const newStart = yToMinutes(yLocal - (dragState.grabOffsetMin / MINUTES_PER_SLOT) * CELL_HEIGHT_PX)
                setDragState({ ...dragState, currentDayIndex: dayIdx, currentStartMin: newStart })
            } else if (dragState.kind === 'resize') {
                const grid = gridRef.current
                if (!grid) return
                const col = grid.querySelector(`[data-day-index="${dragState.dayIndex}"]`) as HTMLElement | null
                if (!col) return
                const rect = col.getBoundingClientRect()
                const yLocal = e.clientY - rect.top
                const endMin = yToMinutes(yLocal)
                const newDur = Math.max(MINUTES_PER_SLOT, endMin - dragState.startMin)
                setDragState({ ...dragState, currentDurationMin: newDur })
            }
        }
        const onUp = () => {
            if (dragState.kind === 'move') {
                if (onMoveEntry) {
                    onMoveEntry(dragState.entryId, week[dragState.currentDayIndex], dragState.currentStartMin)
                }
            } else if (dragState.kind === 'resize') {
                if (onResizeEntry) {
                    onResizeEntry(dragState.entryId, dragState.currentDurationMin)
                }
            }
            setDragState({ kind: 'idle' })
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
    }, [dragState, xToDayIndex, yToMinutes, week, onMoveEntry, onResizeEntry])

    // TT.10 · Diego 2026-09-03 · quitado el auto-scroll a 8am · cortaba
    // entries que arrancaran a 7am (o menos en Extended). El default
    // range 7am-7pm ya cabe entero sin scroll en ≥700px viewport ·
    // Extended (5am-11pm) usa scroll natural. User controla el scroll.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, [showExtended])

    return (
        // TT.30/31 · card panel · shadow-sm en light + border más marcado en dark (dark:border-white/10) porque shadow es casi invisible sobre bg negro.
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm dark:shadow-none dark:border-white/[0.08]">
            {/* TT.15 · Diego 2026-09-03 · panel colapsado a 1 sola row.
                Antes: 2 rows con divider · comía ~110px de alto. Ahora:
                1 row ~48px · date compacto + actions | stats inline |
                toggles. flex-wrap responsive. Objetivo: ganar espacio
                vertical para el day-grid (más día visible sin scroll). */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-x-6 gap-y-2 flex-wrap">
                {/* Left · date compacto + actions inline */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{formatWeekRange(week[0], week[6])}</h3>
                    <div className="h-4 w-px bg-border" aria-hidden />
                    {onCopyPreviousWeek && (
                        <button
                            type="button"
                            onClick={onCopyPreviousWeek}
                            disabled={alreadyCopiedThisWeek}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground border border-input rounded-md px-2 py-1 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={alreadyCopiedThisWeek
                                ? 'Already copied · reset the week to copy again'
                                : "Duplicate last week's non-time-off entries into this week"}
                        >
                            <GripVertical className="h-3 w-3 rotate-90 text-muted-foreground" />
                            {alreadyCopiedThisWeek ? 'Already copied' : 'Copy previous week'}
                        </button>
                    )}
                    {onResetWeek && (
                        <button
                            type="button"
                            onClick={() => {
                                const confirmed = window.confirm(`Reset this week? All ${weekEntries.length} entries for the current week will be deleted. This can't be undone.`)
                                if (confirmed) onResetWeek()
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive border border-input rounded-md px-2 py-1 hover:bg-destructive-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title="Delete all entries for this week (undoable after refresh · mock data)"
                            disabled={weekEntries.length === 0}
                        >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                        </button>
                    )}
                </div>

                {/* Center · stats inline compactos */}
                <div className="flex items-center gap-x-4 gap-y-1 text-xs flex-wrap">
                    <InlineStat label="Bill" hours={billableHours} tone="success" />
                    <InlineStat label="Int" hours={internalHours} tone="info" />
                    <InlineStat label="Total" hours={totalHours} tone="foreground" bold />
                    <InlineStat label={`Cap ${capacity}h`} value={`${pct}%`} tone={pct >= 110 ? 'ai' : pct >= 80 ? 'success' : pct >= 70 ? 'warning' : 'destructive'} bold />
                </div>

                {/* Right · toggles */}
                <div className="flex items-center gap-3">
                    {onToggleSummerFridays && (
                        <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none whitespace-nowrap" title="Reduces weekly capacity target by 4h (36h instead of 40h)">
                            <input
                                type="checkbox"
                                checked={summerFridays}
                                onChange={(e) => onToggleSummerFridays(e.target.checked)}
                                className="h-3.5 w-3.5 accent-primary shrink-0"
                            />
                            Summer Fridays
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowExtended(v => !v)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 border transition-colors ${showExtended ? 'bg-primary text-primary-foreground border-primary' : hiddenEntriesCount > 0 ? 'text-warning border-warning/50 bg-warning-soft hover:bg-warning-soft/80 animate-pulse' : 'text-foreground border-input hover:bg-muted'}`}
                        title={showExtended ? 'Collapse to Mon–Fri, 7am–7pm (standard workweek)' : hiddenEntriesCount > 0 ? `${hiddenEntriesCount} entr${hiddenEntriesCount === 1 ? 'y' : 'ies'} outside 7am–7pm range · click to reveal (24h view)` : 'Expand to full week (Sat/Sun) + off-hours 12am–11pm · for back-fill, holidays, occasional overtime'}
                    >
                        <Sunrise className="h-3 w-3" />
                        {showExtended ? '5-day' : 'Weekend + off-hours'}
                        {/* TT.34 · badge cuando hay entries fuera del rango default */}
                        {!showExtended && hiddenEntriesCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-warning text-warning-foreground text-[10px] font-bold tabular-nums">{hiddenEntriesCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* TT.35 · Diego 2026-09-03 · header FUERA del scroll · body scrolls
                independiente. Antes (TT.26) el header era sticky dentro del
                scroll · un entry con top=0 quedaba visualmente detrás del
                header pero con z-index en algunos angles se veía superpuesto.
                Ahora: 2 wrappers separados · el header wrapper reserva el
                mismo gutter que el body via `scrollbar-gutter: stable` en
                ambos · columnas siempre alineadas independiente del scrollbar. */}
            <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: `60px repeat(${dayCount}, minmax(0, 1fr))`, scrollbarGutter: 'stable', overflowY: 'scroll' }}>
                <div className="border-r border-border" />
                {visibleDays.map((iso, i) => {
                    const isToday = iso === todayIso
                    const isWeekend = i >= 5
                    const dayEntries = weekEntries.filter(e => e.date === iso)
                    const dayHours = sumHours(dayEntries)
                    return (
                        <div key={iso} className={`group/day relative px-2 py-1.5 flex items-baseline justify-center gap-1.5 border-r border-border last:border-r-0 ${isToday ? 'bg-primary-soft' : ''} ${isWeekend ? 'opacity-60' : ''}`}>
                            {/* TT.15 · header 1 line · MON 31 · 7.8h · antes 3 lines (~72px), ahora ~28px */}
                            <span className={`text-[10px] uppercase tracking-wider ${isToday ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>{DAY_LABELS[i]}</span>
                            <span className={`text-sm tabular-nums leading-none ${isToday ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{new Date(iso).getDate()}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">· {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '—'}</span>
                            {/* TT.9 · reset day · hover-reveal icon-button en el header */}
                            {onResetDay && dayEntries.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const confirmed = window.confirm(`Reset ${DAY_LABELS[i]} ${new Date(iso).getDate()}? All ${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'} for this day will be deleted.`)
                                        if (confirmed) onResetDay(iso)
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover/day:opacity-100 p-1 rounded-md text-destructive hover:bg-destructive-soft transition-all"
                                    title={`Delete ${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'} for ${DAY_LABELS[i]}`}
                                    aria-label={`Reset ${DAY_LABELS[i]}`}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Body scroll container · scrollbar-gutter reserva mismo ancho que el header · overflow-hidden en horizontal clip entries que salgan visualmente */}
            <div ref={scrollRef} className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'min(70vh, 640px)', scrollbarGutter: 'stable' }}>
                <div ref={gridRef} className="grid relative" style={{ gridTemplateColumns: `60px repeat(${dayCount}, minmax(0, 1fr))`, height: totalHeight }}>
                    {/* Time axis · TT.14 · primer hour label sin translate-y-1/2
                        (se cortaba 6px por arriba del scroll container). Resto
                        centered en la línea de la hora como Google Cal. */}
                    <div className="relative border-r border-border">
                        {hourLabels.map(h => {
                            const isFirst = h === startHour   // TT.29 · usa rango actual (no hardcoded)
                            return (
                                <div
                                    key={h}
                                    className={`absolute right-2 text-[10px] font-mono tabular-nums text-muted-foreground pr-1 ${isFirst ? '' : '-translate-y-1/2'}`}
                                    style={{ top: isFirst ? 4 : ((h * 60 - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX }}
                                >
                                    {formatTimeOfDayShort(h * 60)}
                                </div>
                            )
                        })}
                    </div>

                    {/* Day columns · TT.8 · iterate visibleDays (matches positionedByDay length) */}
                    {visibleDays.map((iso, dayIndex) => {
                        const isToday = iso === todayIso
                        const isWeekend = dayIndex >= 5
                        const positioned = positionedByDay[dayIndex]
                        return (
                            <div
                                key={iso}
                                data-day-index={dayIndex}
                                onPointerDown={(e) => onColPointerDown(e, dayIndex)}
                                onPointerMove={onColPointerMove}
                                onPointerUp={onColPointerUp}
                                className={`relative border-r border-border last:border-r-0 select-none cursor-crosshair ${isToday ? 'bg-primary-soft/40 ring-2 ring-inset ring-primary/40' : ''} ${isWeekend ? 'opacity-60' : ''}`}
                                style={{ minHeight: totalHeight }}
                                aria-label={`Day column ${DAY_LABELS[dayIndex]} ${new Date(iso).getDate()}`}
                            >
                                {/* Hour grid lines */}
                                {hourLabels.map(h => (
                                    <div
                                        key={h}
                                        className="absolute inset-x-0 border-t border-border/60 pointer-events-none"
                                        style={{ top: ((h * 60 - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX }}
                                    />
                                ))}
                                {/* Half-hour tick (fainter) */}
                                {hourLabels.slice(0, -1).map(h => (
                                    <div
                                        key={`half-${h}`}
                                        className="absolute inset-x-0 border-t border-border/25 pointer-events-none"
                                        style={{ top: (((h * 60 + 30) - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX }}
                                    />
                                ))}

                                {/* Entries */}
                                {positioned.map(entry => {
                                    // If dragging this entry (move), skip · render ghost separately
                                    if (dragState.kind === 'move' && dragState.entryId === entry.id) return null
                                    // If resizing this entry, render with modified height
                                    const isResizing = dragState.kind === 'resize' && dragState.entryId === entry.id
                                    const durationMin = isResizing ? dragState.currentDurationMin : entry.durationMinutes
                                    return (
                                        <EntryBlock
                                            key={entry.id}
                                            entry={entry}
                                            startMin={entry.resolvedStart}
                                            durationMin={durationMin}
                                            colIndex={entry.colIndex}
                                            colCount={entry.colCount}
                                            dayStartMin={dayStartMin}
                                            onEdit={() => onEditEntry(entry)}
                                            onDelete={onDeleteEntry ? () => onDeleteEntry(entry.id) : undefined}
                                            onMoveStart={(grabOffsetMin) => {
                                                setDragState({
                                                    kind: 'move',
                                                    entryId: entry.id,
                                                    originDayIndex: dayIndex,
                                                    originStartMin: entry.resolvedStart,
                                                    grabOffsetMin,
                                                    currentDayIndex: dayIndex,
                                                    currentStartMin: entry.resolvedStart,
                                                })
                                            }}
                                            onResizeStart={() => {
                                                setDragState({
                                                    kind: 'resize',
                                                    entryId: entry.id,
                                                    originDurationMin: entry.durationMinutes,
                                                    currentDurationMin: entry.durationMinutes,
                                                    dayIndex,
                                                    startMin: entry.resolvedStart,
                                                })
                                            }}
                                        />
                                    )
                                })}

                                {/* Ghost block during CREATE */}
                                {dragState.kind === 'create' && dragState.dayIndex === dayIndex && (
                                    <GhostBlock startMin={dragState.startMin} endMin={dragState.currentMin} kind="create" dayStartMin={dayStartMin} />
                                )}

                                {/* Ghost block during MOVE (following pointer) */}
                                {dragState.kind === 'move' && dragState.currentDayIndex === dayIndex && (() => {
                                    const orig = positioned.find(p => p.id === dragState.entryId)
                                    if (!orig) return null
                                    return (
                                        <GhostBlock
                                            startMin={dragState.currentStartMin}
                                            endMin={dragState.currentStartMin + orig.durationMinutes}
                                            kind="move"
                                            label={getTaskType(orig.taskTypeId)?.label ?? 'Entry'}
                                            dayStartMin={dayStartMin}
                                        />
                                    )
                                })()}

                                {/* Current time indicator */}
                                {isToday && nowMinutes >= dayStartMin && nowMinutes <= dayEndMin && (
                                    <div
                                        className="absolute inset-x-0 pointer-events-none z-20"
                                        style={{ top: ((nowMinutes - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX }}
                                    >
                                        <div className="relative h-0 border-t-2 border-destructive">
                                            <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-destructive" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Drag on empty space to create · click a block to edit · drag a block to move · drag its bottom edge to resize</span>
                <span className="tabular-nums">15-min steps · {CALENDAR_DAY_START_HOUR}:00 – {CALENDAR_DAY_END_HOUR}:00</span>
            </div>
        </div>
    )
}

// ============================================================
// EntryBlock
// ============================================================
interface EntryBlockProps {
    entry: TimeEntry
    startMin: number
    durationMin: number
    colIndex: number
    colCount: number
    dayStartMin: number
    onEdit: () => void
    onDelete?: () => void
    onMoveStart: (grabOffsetMin: number) => void
    onResizeStart: () => void
}

function EntryBlock({ entry, startMin, durationMin, colIndex, colCount, dayStartMin, onEdit, onDelete, onMoveStart, onResizeStart }: EntryBlockProps) {
    // TT.31 · Diego 2026-09-03 · detect dark theme para ajustar los inline
    // styles del ProjectChip (los tokens tailwind soportan `dark:` pero los
    // hsl() inline no · leemos la class del root para elegir el hue correcto).
    const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    const project = getProject(entry.projectId)
    const taskType = getTaskType(entry.taskTypeId)
    const top = ((startMin - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX
    const height = Math.max(CELL_HEIGHT_PX, (durationMin / MINUTES_PER_SLOT) * CELL_HEIGHT_PX)
    const widthPct = 100 / colCount
    const leftPct = colIndex * widthPct

    // TT.3 · Diego 2026-09-03 · icon-first rendering + adaptive layout
    // basado en (a) colCount para overlaps y (b) height para short entries.
    const isCompactWidth = colCount >= 2
    const isVeryCompact = colCount >= 3
    const isShort = height < 44
    const isMedium = height >= 44 && height < 72
    // TT.5 · overlap warning · colCount > 1 = designer tiene 2+ entries en
    // la misma franja. Doc no explicita si es permitido, pero el spirit
    // del cliente es "no limits enforced, coaching en dashboard". Aquí
    // señalamos con ring warning sutil + badge micro top-left.
    const isOverlapping = colCount > 1

    const Icon = getTaskIcon(entry.taskTypeId)
    const hue = project ? getProjectHue(project.id) : 0
    // Rail: soft HSL bar left · deterministic per project · no hex hardcoded.
    const railStyle = project ? { background: `hsl(${hue} 55% 55% / 0.85)` } : undefined

    // TT.7 · Diego 2026-09-03 · aumentada opacidad del bg (era /12 y /10 ·
    // texto interno se leía muy sutil). Ahora /25 billable y /20 internal
    // con hover /35-/30 · legibilidad significativamente mejor.
    // TT.32 · Diego 2026-09-03 · entry blocks opacos (bg-card) para parecerse
    // a las cards del DS Strata · antes bg-success/25 los hacía semi-transparentes
    // y el bg del grid se veía a través. Diferenciación billable/internal ahora
    // vía border semantic + el rail izquierdo colorido (project hue).
    const tone = entry.billable
        ? 'bg-card border-success/50 hover:border-success'
        : 'bg-card border-info/50 hover:border-info'
    const accent = entry.billable ? 'text-success' : 'text-info'
    const iconTone = entry.billable ? 'text-success' : 'text-info'
    // TT.7 · Diego 2026-09-03 · project chip · pill con el HSL hue del
    // project (mismo hash que el rail izquierdo) · reemplaza el project
    // name como text · más reconocible + compacto.
    // TT.31 · dark mode · chip background más denso + text más claro para
    // contrast · antes en dark los chips se perdían sobre entries verdes.
    const chipBgStyle = project
        ? isDark
            ? { background: `hsl(${hue} 45% 30% / 0.55)`, borderColor: `hsl(${hue} 55% 55% / 0.50)`, color: `hsl(${hue} 65% 82%)` }
            : { background: `hsl(${hue} 55% 55% / 0.20)`, borderColor: `hsl(${hue} 55% 45% / 0.35)`, color: `hsl(${hue} 60% 25%)` }
        : undefined

    const hours = (durationMin / 60).toFixed(2).replace(/\.?0+$/, '')
    const label = taskType ? formatTaskLabel(taskType, entry.completionState) : 'Untagged'

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
        e.stopPropagation()
        const startY = e.clientY
        const startX = e.clientX
        const startTime = Date.now()
        let moved = false
        const onMove = (ev: PointerEvent) => {
            const dx = Math.abs(ev.clientX - startX)
            const dy = Math.abs(ev.clientY - startY)
            if (!moved && (dx > 5 || dy > 5)) {
                moved = true
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const grabOffsetMin = ((startY - rect.top) / CELL_HEIGHT_PX) * MINUTES_PER_SLOT
                onMoveStart(Math.round(grabOffsetMin / MINUTES_PER_SLOT) * MINUTES_PER_SLOT)
                window.removeEventListener('pointermove', onMove)
                window.removeEventListener('pointerup', onUp)
            }
        }
        const onUp = () => {
            if (!moved && Date.now() - startTime < 500) onEdit()
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }

    const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation()
        e.preventDefault()
        onResizeStart()
    }

    // Rich tooltip content (native title, but with formatted line breaks for hover reveal).
    const tooltipText = [
        label,
        project?.name,
        `${formatTimeOfDay(startMin)} – ${formatTimeOfDay(startMin + durationMin)} · ${hours}h`,
        isOverlapping ? `Overlaps with ${colCount - 1} other entr${colCount - 1 === 1 ? 'y' : 'ies'} in this slot · was this a review or handoff?` : null,
        entry.memo,
        entry.billable ? 'Billable' : 'Internal',
    ].filter(Boolean).join(' · ')

    return (
        <div
            data-entry-id={entry.id}
            onPointerDown={handlePointerDown}
            role="button"
            tabIndex={0}
            aria-label={`Time entry ${label} · ${hours}h · ${formatTimeOfDay(startMin)} to ${formatTimeOfDay(startMin + durationMin)}`}
            onKeyDown={(e) => { if (e.key === 'Enter') onEdit() }}
            className={`group absolute rounded-md border ${tone} cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg hover:z-40 transition-all overflow-hidden ${isOverlapping ? 'ring-1 ring-warning/40 ring-inset' : ''}`}
            style={{
                top,
                height,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                zIndex: 10,
            }}
            title={tooltipText}
        >
            {/* TT.5 · Overlap micro-badge top-left (opposite del deliverable ✓ que va top-right) */}
            {isOverlapping && (
                <div className="absolute top-0 left-0 bg-warning/80 text-white text-[8px] font-bold px-1 rounded-br-md pointer-events-none uppercase tracking-wider z-10">
                    ⚠{colCount}
                </div>
            )}
            {/* Project color rail (deterministic HSL from project id · reconocibilidad) */}
            {project && (
                <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-md pointer-events-none" style={railStyle} />
            )}

            {/* TT.37 · Diego 2026-09-03 · grip icon quitado · era solo visual
                (pointer-events-none) y confundía al user pensando que era una
                acción clickeable. Drag sigue funcionando via el div padre. */}

            {/* Deliverable-complete corner overlay */}
            {entry.deliverableComplete && (
                <div className={`absolute top-0 ${onDelete ? 'right-6' : 'right-0'} bg-success text-white text-[8px] font-bold px-1 rounded-bl-md pointer-events-none uppercase tracking-wider z-10`}>
                    ✓
                </div>
            )}

            {/* TT.9 · Delete inline · hover-reveal · sin abrir el modal · confirm before */}
            {onDelete && (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation()
                        const confirmed = window.confirm(`Delete this entry?\n\n${label} · ${hours}h${project ? ` · ${project.name}` : ''}\n${formatTimeOfDay(startMin)} – ${formatTimeOfDay(startMin + durationMin)}`)
                        if (confirmed) onDelete()
                    }}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-background/80 backdrop-blur-sm text-destructive hover:bg-destructive-soft transition-all z-20"
                    title="Delete this entry (skip the form)"
                    aria-label="Delete entry"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}

            {/* Content · adaptive layout ---------------------------------- */}
            {isShort ? (
                /* SHORT (< 44px): single-row icon + label + hours */
                <div className="pl-2 pr-1.5 py-0.5 pointer-events-none flex items-center gap-1.5 h-full min-w-0">
                    <Icon className={`h-3 w-3 shrink-0 ${iconTone}`} />
                    <span className={`text-[10px] font-semibold truncate flex-1 ${accent}`}>{isVeryCompact ? label.split(' ')[0] : label}</span>
                    <span className="text-[10px] font-mono tabular-nums text-foreground/80 shrink-0">{hours}h</span>
                </div>
            ) : isMedium ? (
                /* MEDIUM (44-72px): icon + label row + project chip + time row */
                <div className="pl-2 pr-1.5 py-1 pointer-events-none flex flex-col h-full min-h-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`h-3 w-3 shrink-0 ${iconTone}`} />
                        <span className={`text-[11px] font-semibold truncate flex-1 ${accent}`}>{label}</span>
                        <span className="text-[10px] font-mono tabular-nums text-foreground shrink-0">{hours}h</span>
                    </div>
                    {project && !isCompactWidth && (
                        <div className="mt-1">
                            <ProjectChip name={project.name} style={chipBgStyle} />
                        </div>
                    )}
                    <div className="mt-auto text-[9px] font-mono tabular-nums text-foreground/70">
                        {formatTimeOfDay(startMin)}
                    </div>
                </div>
            ) : (
                /* FULL (≥72px): icon header + label + project chip + memo + time footer */
                <div className="pl-2 pr-1.5 py-1.5 pointer-events-none flex flex-col h-full min-h-0 gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconTone}`} />
                        <span className={`text-[11px] font-semibold truncate flex-1 ${accent}`}>{label}</span>
                        <span className="text-[10px] font-mono tabular-nums text-foreground shrink-0">{hours}h</span>
                    </div>
                    {project && (
                        <div>
                            <ProjectChip
                                name={isCompactWidth ? project.client : project.name}
                                style={chipBgStyle}
                            />
                        </div>
                    )}
                    {height > 90 && entry.memo && !isVeryCompact && (
                        <div className="text-[10px] text-foreground/75 line-clamp-2 leading-tight">{entry.memo}</div>
                    )}
                    <div className="mt-auto text-[9px] font-mono tabular-nums text-foreground/70">
                        {formatTimeOfDay(startMin)} – {formatTimeOfDay(startMin + durationMin)}
                    </div>
                </div>
            )}

            {/* Resize handle (bottom edge · revealed on hover) */}
            <div
                data-resize-handle="true"
                onPointerDown={handleResizePointerDown}
                className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-b-md transition-colors"
                aria-label="Resize entry"
            />
        </div>
    )
}

// ============================================================
// ProjectChip · TT.7 · pill compacta con el HSL hue del project.
// Inline style para el bg (deterministic per project) · text
// foreground para respetar dark/light mode del DS.
// ============================================================
function ProjectChip({ name, style }: { name: string; style?: React.CSSProperties }) {
    return (
        <span
            className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider truncate max-w-full"
            style={style}
            title={name}
        >
            <span className="truncate">{name}</span>
        </span>
    )
}

// ============================================================
// GhostBlock (drag preview)
// ============================================================
function GhostBlock({ startMin, endMin, kind, label, dayStartMin }: { startMin: number; endMin: number; kind: 'create' | 'move'; label?: string; dayStartMin: number }) {
    const top = ((Math.min(startMin, endMin) - dayStartMin) / MINUTES_PER_SLOT) * CELL_HEIGHT_PX
    const height = Math.abs(endMin - startMin) / MINUTES_PER_SLOT * CELL_HEIGHT_PX
    const durationMin = endMin - startMin
    const hours = (durationMin / 60).toFixed(2).replace(/\.?0+$/, '')
    return (
        <div
            className={`absolute inset-x-0.5 rounded-md pointer-events-none z-30 ${kind === 'create' ? 'bg-primary/30 border-2 border-dashed border-primary' : 'bg-foreground/20 border-2 border-foreground/60 shadow-lg'}`}
            style={{ top, height: Math.max(CELL_HEIGHT_PX, height) }}
        >
            <div className="p-1.5 text-[10px] font-mono tabular-nums text-foreground">
                {label && <div className="text-[11px] font-semibold truncate">{label}</div>}
                <div>{formatTimeOfDay(Math.min(startMin, endMin))} – {formatTimeOfDay(Math.max(startMin, endMin))}</div>
                <div>{hours}h</div>
            </div>
        </div>
    )
}

// ============================================================
// SummaryStat (reuse TT.1 pattern)
// ============================================================
function SummaryStat({ label, hours, value, tone }: { label: string; hours?: number; value?: string; tone: 'foreground' | 'success' | 'info' | 'warning' | 'destructive' | 'ai' }) {
    const toneClass = tone === 'foreground' ? 'text-foreground'
        : tone === 'success' ? 'text-success'
        : tone === 'info' ? 'text-info'
        : tone === 'warning' ? 'text-warning'
        : tone === 'destructive' ? 'text-destructive'
        : 'text-ai'
    return (
        <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`text-sm font-semibold tabular-nums ${toneClass}`}>
                {value ?? `${(hours ?? 0).toFixed(1)}h`}
            </div>
        </div>
    )
}

// TT.15 · variante inline · label + value en una sola línea (compact panel).
function InlineStat({ label, hours, value, tone, bold }: { label: string; hours?: number; value?: string; tone: 'foreground' | 'success' | 'info' | 'warning' | 'destructive' | 'ai'; bold?: boolean }) {
    const toneClass = tone === 'foreground' ? 'text-foreground'
        : tone === 'success' ? 'text-success'
        : tone === 'info' ? 'text-info'
        : tone === 'warning' ? 'text-warning'
        : tone === 'destructive' ? 'text-destructive'
        : 'text-ai'
    return (
        <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className={`text-xs tabular-nums ${bold ? 'font-semibold' : 'font-medium'} ${toneClass}`}>
                {value ?? `${(hours ?? 0).toFixed(1)}h`}
            </span>
        </span>
    )
}

// ============================================================
// Helpers
// ============================================================
function addDaysIso(iso: string, n: number): string {
    const d = new Date(iso)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
}

function formatWeekRange(mondayIso: string, sundayIso: string): string {
    const s = new Date(mondayIso)
    const e = new Date(sundayIso)
    const sameMonth = s.getMonth() === e.getMonth()
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const startStr = s.toLocaleDateString('en-US', opts)
    const endStr = sameMonth ? e.getDate().toString() : e.toLocaleDateString('en-US', opts)
    return `${startStr}–${endStr}, ${e.getFullYear()}`
}

export function mondayOf(iso: string): string {
    const d = new Date(iso)
    const dow = d.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
}

function getCurrentMinutes(): number {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
}

// Position entries within a day column · resolves start times + assigns
// overlap columns (side-by-side rendering).
// TT.5 · Auto-stack fallback usa 8am workday standard (no depende del
// range visible del calendar toggle).
const AUTO_STACK_START = 8 * 60
function positionDay(dayEntries: TimeEntry[]): PositionedEntry[] {
    if (dayEntries.length === 0) return []
    // Auto-stack any entry that's missing an explicit start time.
    let cursor = AUTO_STACK_START
    const resolved: (TimeEntry & { resolvedStart: number })[] = []
    // Explicit-start entries first (sorted)
    const withStart = [...dayEntries].filter(e => e.startMinutesFromMidnight != null).sort((a, b) => (a.startMinutesFromMidnight ?? 0) - (b.startMinutesFromMidnight ?? 0))
    const withoutStart = dayEntries.filter(e => e.startMinutesFromMidnight == null)
    for (const e of withStart) {
        resolved.push({ ...e, resolvedStart: e.startMinutesFromMidnight! })
        cursor = Math.max(cursor, e.startMinutesFromMidnight! + e.durationMinutes + 15)
    }
    for (const e of withoutStart) {
        const start = cursor
        resolved.push({ ...e, resolvedStart: start })
        cursor = start + e.durationMinutes + 15
    }

    // Assign overlap columns via greedy sweep
    resolved.sort((a, b) => a.resolvedStart - b.resolvedStart)
    // Each item tracked as { start, end, col }
    const active: { end: number; col: number }[] = []
    const cols: number[] = []
    for (const e of resolved) {
        const start = e.resolvedStart
        const end = start + e.durationMinutes
        // Remove ended
        for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= start) active.splice(i, 1)
        // Find lowest free col
        const usedCols = new Set(active.map(a => a.col))
        let col = 0
        while (usedCols.has(col)) col++
        active.push({ end, col })
        cols.push(col)
    }

    // Group into overlap sets to compute colCount for each entry.
    // Simple approach: for each entry, colCount = max col seen among entries
    // whose interval overlaps its interval.
    return resolved.map((e, i) => {
        const start = e.resolvedStart
        const end = start + e.durationMinutes
        let maxCol = cols[i]
        for (let j = 0; j < resolved.length; j++) {
            const other = resolved[j]
            const otherEnd = other.resolvedStart + other.durationMinutes
            if (other.resolvedStart < end && otherEnd > start) {
                maxCol = Math.max(maxCol, cols[j])
            }
        }
        return { ...e, colIndex: cols[i], colCount: maxCol + 1 }
    })
}
