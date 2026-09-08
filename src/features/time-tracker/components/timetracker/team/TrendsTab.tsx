// TT.43.2 · Diego 2026-09-08 · Trends tab.
// Reorden · training-gap sparklines PRIMERO (whitespace #3 · headline
// differentiator) · charts must-have DESPUÉS · consolidados y
// justificados por doc:
//   - Hours vs Sold  · benchmark:225 · 3 KPI must-have
//   - Production Rate · benchmark:223 · KPI must-have C-level
// Eliminados de este flujo (Diego · 'solo los más relevantes'):
//   BillableDonut · BudgetStatusTable · Team velocity chart.

import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import TrainingGapSparklines from '../TrainingGapSparklines'
import HoursVsSoldCard from './HoursVsSoldCard'
import ProductionRateCard from './ProductionRateCard'
import { buildTrendsSummary } from '../../../data/managerInsights'
import type { TrainingGapRow, HoursVsSold, BucketRate } from '../../../data/managerInsights'
import type { DesignerId } from '../../../data/timeEntries'

interface Props {
    rows: TrainingGapRow[]
    onDesignerClick: (designerId: DesignerId) => void
    hoursVsSold: HoursVsSold
    productionRate: BucketRate[]
}

const THRESHOLDS = [10, 15, 30] as const

export default function TrendsTab({ rows, onDesignerClick, hoursVsSold, productionRate }: Props) {
    const [threshold, setThreshold] = useState<number>(15)

    const summary = useMemo(() => buildTrendsSummary(rows, threshold), [rows, threshold])
    const filtered = useMemo(() => rows.filter(r => Math.abs(r.trendPercent) >= threshold), [rows, threshold])

    const designerCount = rows.length > 0 ? new Set(rows.map(r => r.designerId)).size : 0

    return (
        <div className="space-y-4">
            {/* TT.43.3 · summary chips + threshold en 1 sola row (antes 4 cards
                grandes + row de threshold aparte ocupaban ~180px · ahora ~40px). */}
            <div className="flex items-center gap-2 flex-wrap px-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Activity className="h-3 w-3" />
                    {summary.total} rows · {designerCount} designers
                </span>
                <span className="text-muted-foreground/50">·</span>
                <SummaryChip icon={TrendingUp} label="slowing" value={summary.slower} tone={summary.slower > 3 ? 'warning' : 'muted'} />
                <SummaryChip icon={TrendingDown} label="faster" value={summary.faster} tone={summary.faster > 0 ? 'success' : 'muted'} />
                <SummaryChip icon={Minus} label="stable" value={summary.stable} tone="muted" />
                <span className="text-[11px] text-muted-foreground tabular-nums">avg change {summary.avgAbsChange}%</span>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Threshold</span>
                    <div className="inline-flex rounded-md border border-input p-0.5 bg-background">
                        {THRESHOLDS.map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setThreshold(t)}
                                className={`px-2 py-0.5 text-xs font-semibold rounded tabular-nums transition-colors ${threshold === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                title={`Show rows where |trend| ≥ ${t}%`}
                            >
                                ±{t}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Training-gap sparklines · headline whitespace #3 */}
            <TrainingGapSparklines rows={filtered} onDesignerClick={onDesignerClick} />

            {/* Charts must-have debajo · benchmark:223 + benchmark:225 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <HoursVsSoldCard data={hoursVsSold} />
                <ProductionRateCard buckets={productionRate} />
            </div>
        </div>
    )
}

function SummaryChip({ icon: Icon, label, value, tone }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    tone: 'success' | 'warning' | 'muted'
}) {
    const cls = tone === 'success' ? 'text-success bg-success-soft border-success/30'
        : tone === 'warning' ? 'text-warning bg-warning-soft border-warning/30'
        : 'text-muted-foreground bg-muted/40 border-border'
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${cls}`}>
            <Icon className="h-2.5 w-2.5" />
            <span className="font-semibold">{value}</span>
            <span className="opacity-80">{label}</span>
        </span>
    )
}
