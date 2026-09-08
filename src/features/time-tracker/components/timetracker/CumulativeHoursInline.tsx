// TT.1 · Diego 2026-09-03 · Whitespace #2 · in-form cumulative hours.
// No competitor renders "Project total after save: X.Xh / Yh budget"
// inline in the entry form · Harvest has it in project view only.
// See wurkwel-benchmark-2026-09-03.md · whitespace #2.
//
// Live math: baseline + all logged entries + the currently-open form's
// duration. Shows amber >80% of budget, red >100% (over-budget signal).

import { useMemo } from 'react'
import { getProject } from '../../data/projects'
import { projectCumulativeMinutes, type TimeEntry } from '../../data/timeEntries'

interface Props {
    projectId: string | null
    /** Draft duration in minutes from the open form · adds to the total. */
    draftDurationMinutes?: number
    /** Existing entries (usually the app state, so live edits reflect). */
    entries: TimeEntry[]
}

export default function CumulativeHoursInline({ projectId, draftDurationMinutes = 0, entries }: Props) {
    const project = getProject(projectId)

    const computed = useMemo(() => {
        if (!project) return null
        const persistedMinutes = projectCumulativeMinutes(project.id, entries)
        const totalAfterSaveMin = persistedMinutes + draftDurationMinutes
        const totalHours = totalAfterSaveMin / 60
        const budgetHours = project.budgetHours
        const percent = (totalHours / budgetHours) * 100
        return {
            totalHours,
            budgetHours,
            percent,
            severity: percent > 100 ? 'over' as const : percent > 80 ? 'warn' as const : 'ok' as const,
        }
    }, [project, draftDurationMinutes, entries])

    if (!project || !computed) {
        return (
            <div className="text-xs text-muted-foreground">
                Pick a project to see how it stacks up against the plan.
            </div>
        )
    }

    const { totalHours, budgetHours, percent, severity } = computed
    // TT.45.1 · Diego 2026-09-08 · wording Bundle A · designer-friendly plain
    // english · vocabulary de la doc SOT ('hours planned' en vez de 'budget').
    const severityCopy = severity === 'over'
        ? 'past the plan'
        : severity === 'warn'
        ? 'near the limit'
        : 'on track'
    const severityClasses = severity === 'over'
        ? 'text-destructive'
        : severity === 'warn'
        ? 'text-warning'
        : 'text-success'
    const barColor = severity === 'over'
        ? 'bg-destructive'
        : severity === 'warn'
        ? 'bg-warning'
        : 'bg-success'

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                    Project hours after this save
                </span>
                <span className="font-mono tabular-nums">
                    <span className="font-semibold text-foreground">{totalHours.toFixed(1)}h</span>
                    <span className="text-muted-foreground"> of {budgetHours}h planned</span>
                </span>
            </div>
            {/* Slim progress bar (Tufte-flat, no shadow) */}
            <div className="relative h-1 rounded-full bg-muted overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 ${barColor} transition-[width] duration-300`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
                {percent > 100 && (
                    <div
                        className="absolute inset-y-0 right-0 bg-destructive/40 border-l border-destructive"
                        style={{ width: `${Math.min(percent - 100, 30)}%` }}
                    />
                )}
            </div>
            <div className={`flex items-center justify-between text-[11px] ${severityClasses}`}>
                <span className="font-medium">{Math.round(percent)}% · {severityCopy}</span>
                {draftDurationMinutes > 0 && (
                    <span className="text-muted-foreground">
                        this entry adds +{(draftDurationMinutes / 60).toFixed(2)}h
                    </span>
                )}
            </div>
        </div>
    )
}
