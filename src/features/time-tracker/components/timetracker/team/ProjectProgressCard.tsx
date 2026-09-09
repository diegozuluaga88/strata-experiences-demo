// TT.65 · Diego 2026-09-09 · Project progress / budget compliance card.
// "graficas de seguimiento cumplimiento por proyecto cuales estan a puento
// de llegar a una meta u objetivo para que el manager pueda toar mejores
// desiciones".
//
// Layout: lista compacta de proyectos activos ordenados por urgencia (past
// > near > on-track > early). Cada row: name + client + progress bar
// (color por status) + hours logged / budget + % + remaining. Manager
// escanea en 2 segundos qué proyectos necesitan atención.
//
// Status tokens:
//   - past       (red · destructive)     ≥100% del budget
//   - near       (amber · warning)       ≥80% & <100%
//   - on-track   (green · success)       ≥40% & <80%
//   - early      (muted)                 <40%

import { Target, AlertTriangle, TrendingUp, Sparkles, ChevronRight } from 'lucide-react'
import type { ProjectProgressRow, ProjectProgressStatus } from '../../../data/managerInsights'

interface Props {
    rows: ProjectProgressRow[]
    /** TT.65.1 · click a row to open the drill-down modal. */
    onRowClick?: (row: ProjectProgressRow) => void
}

const STATUS_META: Record<ProjectProgressStatus, {
    label: string
    barColor: string        // Tailwind bg-* for progress fill
    trackColor: string      // Tailwind bg-* for track background
    pillBg: string
    pillText: string
    icon: React.ComponentType<{ className?: string }>
    hint: string
}> = {
    past: {
        label: 'Past the plan',
        barColor: 'bg-destructive',
        trackColor: 'bg-destructive-soft',
        pillBg: 'bg-destructive/15',
        pillText: 'text-destructive',
        icon: AlertTriangle,
        hint: 'Over budget · re-scope or extend',
    },
    near: {
        label: 'Near the limit',
        barColor: 'bg-warning',
        trackColor: 'bg-warning-soft',
        pillBg: 'bg-warning/15',
        pillText: 'text-warning',
        icon: TrendingUp,
        hint: '≥80% of budget · check-in soon',
    },
    'on-track': {
        label: 'On track',
        barColor: 'bg-success',
        trackColor: 'bg-success-soft',
        pillBg: 'bg-success/15',
        pillText: 'text-success',
        icon: Target,
        hint: 'Pacing well vs budget',
    },
    early: {
        label: 'Early',
        barColor: 'bg-muted-foreground/40',
        trackColor: 'bg-muted',
        pillBg: 'bg-muted',
        pillText: 'text-muted-foreground',
        icon: Sparkles,
        hint: 'Under 40% of budget · plenty of runway',
    },
}

export default function ProjectProgressCard({ rows, onRowClick }: Props) {
    if (rows.length === 0) return null

    const counts: Record<ProjectProgressStatus, number> = {
        past: rows.filter(r => r.status === 'past').length,
        near: rows.filter(r => r.status === 'near').length,
        'on-track': rows.filter(r => r.status === 'on-track').length,
        early: rows.filter(r => r.status === 'early').length,
    }
    const needsAttention = counts.past + counts.near

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
                <div className="flex items-baseline justify-between flex-wrap gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Project progress vs plan
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by proximity to budget cap · past-the-plan first · manager triage view.</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                        {counts.past > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                {counts.past} past
                            </span>
                        )}
                        {counts.near > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
                                <TrendingUp className="h-3 w-3" />
                                {counts.near} near
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                            <Target className="h-3 w-3" />
                            {counts['on-track']} on track
                        </span>
                        {counts.early > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                                <Sparkles className="h-3 w-3" />
                                {counts.early} early
                            </span>
                        )}
                    </div>
                </div>
                {needsAttention > 0 && (
                    <p className="mt-3 text-xs text-foreground">
                        <span className="font-semibold text-destructive">{needsAttention}</span>
                        {' '}project{needsAttention === 1 ? '' : 's'} need{needsAttention === 1 ? 's' : ''} attention this week.
                    </p>
                )}
            </div>

            <ul className="divide-y divide-border">
                {rows.map(r => {
                    const meta = STATUS_META[r.status]
                    const Icon = meta.icon
                    const barWidth = Math.min(100, r.pctOfBudget)
                    const isClickable = !!onRowClick
                    return (
                        <li key={r.project.id}>
                            {isClickable ? (
                                <button
                                    type="button"
                                    onClick={() => onRowClick(r)}
                                    className="w-full text-left p-4 hover:bg-muted/40 transition-colors group focus:outline-none focus:bg-muted/40"
                                    title="Open project detail · deliverables + ongoing work"
                                >
                                    <RowContent r={r} meta={meta} Icon={Icon} barWidth={barWidth} showChevron />
                                </button>
                            ) : (
                                <div className="p-4">
                                    <RowContent r={r} meta={meta} Icon={Icon} barWidth={barWidth} />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function RowContent({ r, meta, Icon, barWidth, showChevron }: { r: ProjectProgressRow; meta: typeof STATUS_META[ProjectProgressStatus]; Icon: React.ComponentType<{ className?: string }>; barWidth: number; showChevron?: boolean }) {
    return (
        <>
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{r.project.name}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.pillBg} ${meta.pillText}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {meta.label}
                        </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {r.project.client} · <span className="font-mono">{r.project.id}</span> · {r.project.company}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right tabular-nums">
                        <div className="text-sm font-semibold text-foreground">
                            {r.hoursLogged.toFixed(1)}h <span className="text-muted-foreground font-normal">/ {r.budgetHours}h</span>
                        </div>
                        <div className={`text-[11px] font-medium ${meta.pillText}`}>
                            {r.pctOfBudget}% · {r.remainingHours >= 0 ? `${r.remainingHours.toFixed(1)}h left` : `${Math.abs(r.remainingHours).toFixed(1)}h over`}
                        </div>
                    </div>
                    {showChevron && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    )}
                </div>
            </div>
            <div className={`relative h-2 rounded-full overflow-hidden ${meta.trackColor}`}>
                <div
                    className={`absolute inset-y-0 left-0 ${meta.barColor} transition-all`}
                    style={{ width: `${barWidth}%` }}
                />
                {r.pctOfBudget > 100 && (
                    <div className="absolute inset-y-0 right-0 w-1 bg-destructive-foreground/30" title="Over budget overflow indicator" />
                )}
            </div>
        </>
    )
}
