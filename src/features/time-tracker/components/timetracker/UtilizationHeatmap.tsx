// TT.6 · Diego 2026-09-03 · Utilization heatmap · Toggl Workload pattern.
// Rows = designers · cols = weekdays · cell = daily utilization %.
// Thresholds per benchmark: >110% over (ai/purple) · ≥80% ok (success) ·
// 70-79% watch (warning) · <70% below (destructive) · 0h nodata (muted).
// Click row → drill-down modal (via onDesignerClick).

import { avatarGradient, getTeamMember } from '../team/teamMembers'
import type { UtilizationCell } from '../../data/managerInsights'
import type { DesignerId } from '../../data/timeEntries'

interface Props {
    grid: UtilizationCell[][]  // rows: designer, cols: day
    weekDays: string[]         // ISO YYYY-MM-DD
    todayIso: string
    onDesignerClick?: (designerId: DesignerId) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function UtilizationHeatmap({ grid, weekDays, todayIso, onDesignerClick }: Props) {
    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-baseline justify-between px-5 py-4 border-b border-border">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Team utilization</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily hours vs each designer's daily capacity target.</p>
                </div>
                <Legend />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Designer</th>
                            {weekDays.map((iso, i) => {
                                const isToday = iso === todayIso
                                const isWeekend = i >= 5
                                return (
                                    <th key={iso} className={`text-center px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${isToday ? 'text-foreground' : ''} ${isWeekend ? 'opacity-60' : ''}`}>
                                        {DAY_LABELS[i]}
                                        <div className="font-normal text-[9px] mt-0.5 tabular-nums">{new Date(iso).getDate()}</div>
                                    </th>
                                )
                            })}
                            <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Week total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grid.map(row => {
                            const designerId = row[0]?.designerId
                            const person = getTeamMember(designerId)
                            const weekTotal = row.reduce((s, c) => s + c.hoursLogged, 0)
                            const weekCapacity = row.reduce((s, c) => s + c.dailyCapacity, 0)
                            const weekPct = weekCapacity > 0 ? Math.round((weekTotal / weekCapacity) * 100) : 0
                            return (
                                <tr key={designerId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onDesignerClick?.(designerId)}>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(designerId)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                                                {person?.initials ?? '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-foreground truncate">{person?.name ?? designerId}</div>
                                                <div className="text-[10px] text-muted-foreground tabular-nums">{(weekCapacity).toFixed(0)}h cap</div>
                                            </div>
                                        </div>
                                    </td>
                                    {row.map(cell => <HeatmapCell key={cell.dateIso} cell={cell} isToday={cell.dateIso === todayIso} />)}
                                    <td className="px-4 py-2 text-right">
                                        <div className={`text-sm font-semibold tabular-nums ${weekPctTone(weekPct)}`}>
                                            {weekTotal.toFixed(1)}h
                                        </div>
                                        <div className={`text-[10px] tabular-nums ${weekPctTone(weekPct)}`}>{weekPct}%</div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function HeatmapCell({ cell, isToday }: { cell: UtilizationCell; isToday: boolean }) {
    const { tier, hoursLogged, percent } = cell
    const bg =
        tier === 'over' ? 'bg-ai/25 text-ai-foreground' :
        tier === 'ok' ? 'bg-success/25 text-success-foreground' :
        tier === 'watch' ? 'bg-warning/25 text-warning-foreground' :
        tier === 'below' ? 'bg-destructive/20 text-destructive-foreground' :
        'bg-muted/40 text-muted-foreground'
    return (
        <td className={`px-1 py-1 text-center ${isToday ? 'ring-1 ring-inset ring-primary/30' : ''}`}>
            <div
                className={`inline-flex flex-col items-center justify-center min-w-[52px] mx-auto rounded-md ${bg} px-2 py-1.5`}
                title={`${hoursLogged.toFixed(1)}h / ${cell.dailyCapacity.toFixed(1)}h · ${Math.round(percent)}%`}
            >
                <span className="text-sm font-semibold tabular-nums">{hoursLogged > 0 ? hoursLogged.toFixed(1) : '—'}</span>
                {hoursLogged > 0 && <span className="text-[9px] tabular-nums opacity-80">{Math.round(percent)}%</span>}
            </div>
        </td>
    )
}

function weekPctTone(pct: number): string {
    if (pct > 110) return 'text-ai'
    if (pct >= 80) return 'text-success'
    if (pct >= 70) return 'text-warning'
    return 'text-destructive'
}

function Legend() {
    return (
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            <LegendItem swatch="bg-destructive/20" label="<70%" />
            <LegendItem swatch="bg-warning/25" label="70–79%" />
            <LegendItem swatch="bg-success/25" label="≥80%" />
            <LegendItem swatch="bg-ai/25" label=">110%" />
        </div>
    )
}
function LegendItem({ swatch, label }: { swatch: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-3.5 rounded ${swatch} border border-border`} />
            {label}
        </span>
    )
}
