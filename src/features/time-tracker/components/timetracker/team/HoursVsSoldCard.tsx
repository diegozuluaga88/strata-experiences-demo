// TT.43 · Diego 2026-09-08 · Hours vs Sold card · benchmark:225 must-have KPI.
// Triple metric · Logged / Sold / Variance % con tone semantic.
//
// Variance bands per benchmark: green <90% within · amber 90-110% · red >110%.

import { Scale } from 'lucide-react'
import type { HoursVsSold } from '../../../data/managerInsights'

interface Props {
    data: HoursVsSold
}

export default function HoursVsSoldCard({ data }: Props) {
    const { logged, sold, variancePercent, projectCount } = data
    // Bands: <90% under · 90-110% on · >110% over
    const tone: 'success' | 'warning' | 'destructive' | 'muted' =
        sold === 0 ? 'muted' :
        variancePercent > 110 ? 'destructive' :
        variancePercent < 90 ? 'warning' :
        'success'
    const toneLabel =
        tone === 'success' ? 'On plan' :
        tone === 'destructive' ? 'Over pace' :
        tone === 'warning' ? 'Under pace' :
        'No projects'
    const toneText =
        tone === 'success' ? 'text-success' :
        tone === 'destructive' ? 'text-destructive' :
        tone === 'warning' ? 'text-warning' :
        'text-muted-foreground'

    return (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-foreground">Hours vs sold</h4>
                    <p className="text-[11px] text-muted-foreground">This week · {projectCount} active project{projectCount === 1 ? '' : 's'}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Metric label="Logged" value={`${logged.toFixed(1)}h`} tone="foreground" />
                <Metric label="Sold pace" value={`${sold.toFixed(1)}h`} tone="muted" />
            </div>
            <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-baseline justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Variance</div>
                    <div className={`text-2xl font-semibold tabular-nums ${toneText}`}>
                        {sold > 0 ? `${variancePercent}%` : '—'}
                    </div>
                </div>
                <div className={`text-xs font-medium mt-0.5 ${toneText}`}>{toneLabel}</div>
            </div>
        </div>
    )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'foreground' | 'muted' }) {
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`text-xl font-semibold tabular-nums ${tone === 'foreground' ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</div>
        </div>
    )
}
