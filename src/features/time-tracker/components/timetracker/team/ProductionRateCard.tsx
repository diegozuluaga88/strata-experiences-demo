// TT.43 · Diego 2026-09-08 · Production Rate por project size bucket.
// benchmark:223 · KPI must-have C-level (Jimmy) · avg hours per project por
// bucket ($0-10K / $10-100K / $100K+) para spot buckets under/over performing.

import { TrendingUp } from 'lucide-react'
import type { BucketRate } from '../../../data/managerInsights'

interface Props {
    buckets: BucketRate[]
}

export default function ProductionRateCard({ buckets }: Props) {
    const totalHours = buckets.reduce((s, b) => s + b.totalHours, 0)
    const maxAvg = Math.max(1, ...buckets.map(b => b.avgHoursPerProject))

    return (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-foreground">Production rate</h4>
                    <p className="text-[11px] text-muted-foreground">Avg hours per project · by contract size</p>
                </div>
            </div>
            <ul className="space-y-2.5 flex-1">
                {buckets.map(b => {
                    const barPct = maxAvg > 0 ? Math.round((b.avgHoursPerProject / maxAvg) * 100) : 0
                    return (
                        <li key={b.bucket}>
                            <div className="flex items-baseline justify-between text-xs">
                                <span className="font-medium text-foreground tabular-nums">{b.label}</span>
                                <div className="text-muted-foreground">
                                    <span className="font-semibold text-foreground tabular-nums">{b.avgHoursPerProject.toFixed(1)}h</span>
                                    <span className="text-[10px] ml-1">avg · {b.projectCount} proj</span>
                                </div>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full bg-primary/70 rounded-full transition-[width] duration-300"
                                    style={{ width: `${b.avgHoursPerProject > 0 ? Math.max(barPct, 3) : 0}%` }}
                                />
                            </div>
                        </li>
                    )
                })}
            </ul>
            <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                Team total this week · <span className="font-semibold text-foreground tabular-nums">{totalHours.toFixed(1)}h</span>
            </div>
        </div>
    )
}
