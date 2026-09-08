// TT.42 + TT.43 · Diego 2026-09-07/08 · Team View sub-tabs.
// - Tab Utilization (default) · pain #2 · heatmap + 4 filtros + 4 charts de valor.
// - Tab Attention (badge) · pain #1 missing + pain #6 outliers.
// - Tab Trends (badge) · whitespace #3 velocity sparklines.
//
// Selectors calculados 1 sola vez y pasados a los tabs. TT.43 agrega
// filtros locales al Utilization tab · state managed aquí para que aplique
// tanto al heatmap como a los 4 charts (single source of truth).

import { useMemo, useState } from 'react'
import { BarChart3, AlertCircle, LineChart } from 'lucide-react'
import TabsShell, { type TabDef } from './team/TabsShell'
import UtilizationHeatmap from './UtilizationHeatmap'
import MissingTimeDigest from './MissingTimeDigest'
import OutlierCoachingCard from './OutlierCoachingCard'
import DesignerDrilldown from './DesignerDrilldown'
import TrendsTab from './team/TrendsTab'
import UtilizationFiltersStrip from './team/UtilizationFilters'
import GenerateReportButton from './team/GenerateReportButton'
import { getTeamMember } from '../team/teamMembers'
import {
    buildUtilizationGrid,
    detectMissingTime,
    detectOutliers,
    buildTrainingGaps,
    buildDesignerWeekTotals,
    weekDays,
    DEFAULT_FILTERS,
    buildFilterOptions,
    buildHoursVsSold,
    buildProductionRateByBucket,
    filterUtilizationEntries,
    type UtilizationFilters,
} from '../../data/managerInsights'
import type { TeamReportData } from '../../utils/generateTeamReportPdf'
import type { TimeEntry, DesignerId } from '../../data/timeEntries'

interface Props {
    weekMondayIso: string
    allEntries: TimeEntry[]
    todayIso: string
    summerFridaysActive?: boolean
    onSendDigest?: (designerIds: string[]) => void
    onSendCoachingMessage?: (designerId: string, entryId: string, message?: string) => void
    /** TT.44 · toast callback from Generate report action. */
    onReportGenerated?: (kind: 'success' | 'error', message: string) => void
}

export default function TeamView({
    weekMondayIso, allEntries, todayIso, summerFridaysActive = false, onSendDigest, onSendCoachingMessage, onReportGenerated,
}: Props) {
    const [drilldownDesignerId, setDrilldownDesignerId] = useState<DesignerId | null>(null)

    // TT.43 · filtros state para el Utilization tab.
    const [filters, setFilters] = useState<UtilizationFilters>(DEFAULT_FILTERS)
    const filterOptions = useMemo(() => buildFilterOptions(), [])

    // Selectors · 1 sola vez · pasados como props a los tabs (no duplicación).
    const days = useMemo(() => weekDays(weekMondayIso), [weekMondayIso])
    const missing = useMemo(() => detectMissingTime(weekMondayIso, allEntries, summerFridaysActive, todayIso), [weekMondayIso, allEntries, summerFridaysActive, todayIso])
    const outliers = useMemo(() => detectOutliers(weekMondayIso, allEntries), [weekMondayIso, allEntries])
    const trainingGaps = useMemo(() => buildTrainingGaps(weekMondayIso, allEntries), [weekMondayIso, allEntries])

    // TT.43.2 · Utilization tab · solo heatmap + filtros.
    const filteredEntries = useMemo(() => filterUtilizationEntries(allEntries, filters), [allEntries, filters])
    const utilGrid = useMemo(() => buildUtilizationGrid(weekMondayIso, filteredEntries, summerFridaysActive), [weekMondayIso, filteredEntries, summerFridaysActive])

    // TT.43.2 · Trends tab · Hours-vs-Sold + Production Rate (moved from Utilization).
    // Sin filters (team-wide) · benchmark:223 + benchmark:225 must-have KPIs.
    const hoursVsSold = useMemo(() => buildHoursVsSold(weekMondayIso, allEntries, DEFAULT_FILTERS), [weekMondayIso, allEntries])
    const productionRate = useMemo(() => buildProductionRateByBucket(weekMondayIso, allEntries, DEFAULT_FILTERS), [weekMondayIso, allEntries])

    // TT.44 · report data · usa el grid SIN filters (team-wide) para no
    // sesgar el PDF por lo que el user esté filtrando en la UI.
    const weekTotals = useMemo(() => buildDesignerWeekTotals(weekMondayIso, allEntries, summerFridaysActive), [weekMondayIso, allEntries, summerFridaysActive])
    const utilGridUnfiltered = useMemo(() => buildUtilizationGrid(weekMondayIso, allEntries, summerFridaysActive), [weekMondayIso, allEntries, summerFridaysActive])
    const reportData: TeamReportData = useMemo(() => ({
        weekMondayIso,
        weekLabel: formatWeekRange(days[0], days[6]),
        generatedAt: new Date().toISOString(),
        weekTotals,
        missing,
        outliers,
        trainingGaps,
        utilGrid: utilGridUnfiltered,
        weekDays: days,
        hoursVsSold,
        productionRate,
        getName: (id: string) => getTeamMember(id)?.name ?? id,
    }), [weekMondayIso, days, weekTotals, missing, outliers, trainingGaps, utilGridUnfiltered, hoursVsSold, productionRate])

    const openDrilldown = (designerId: string) => setDrilldownDesignerId(designerId as DesignerId)

    const attentionCount = missing.length + outliers.length
    const trendsCount = trainingGaps.filter(g => Math.abs(g.trendPercent) >= 15).length

    const tabs: TabDef[] = [
        {
            id: 'utilization',
            label: 'Utilization',
            icon: BarChart3,
            description: 'Daily hours + budget status + billable split · filter by company / billable / project size / sales rep.',
        },
        {
            id: 'attention',
            label: 'Attention',
            icon: AlertCircle,
            badge: attentionCount,
            badgeTone: attentionCount > 5 ? 'destructive' : attentionCount > 0 ? 'warning' : 'muted',
            description: 'Designers behind target (send digest) + long sessions (write a check-in inline). Action-focused.',
        },
        {
            id: 'trends',
            label: 'Trends',
            icon: LineChart,
            badge: trendsCount,
            badgeTone: trendsCount > 3 ? 'warning' : 'muted',
            description: '4-week velocity sparklines per designer × task type · spot training gaps early.',
        },
    ]

    return (
        <>
            {/* TT.44 · Generate report action · above the tab strip, right-aligned. */}
            <div className="flex justify-end mb-3">
                <GenerateReportButton data={reportData} onGenerated={onReportGenerated} />
            </div>

            <TabsShell tabs={tabs} defaultTabId="utilization">
                {(active) => {
                    if (active === 'utilization') {
                        return (
                            <div className="space-y-4">
                                <UtilizationFiltersStrip value={filters} onChange={setFilters} options={filterOptions} />
                                <UtilizationHeatmap
                                    grid={utilGrid}
                                    weekDays={days}
                                    todayIso={todayIso}
                                    onDesignerClick={openDrilldown}
                                />
                            </div>
                        )
                    }
                    if (active === 'attention') {
                        if (missing.length === 0 && outliers.length === 0) {
                            return (
                                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                                    <div className="text-sm font-semibold text-foreground">All good this week</div>
                                    <p className="text-xs text-muted-foreground mt-1">Nobody's behind target · no long sessions flagged.</p>
                                </div>
                            )
                        }
                        return (
                            <div className="space-y-4">
                                {missing.length > 0 && (
                                    <MissingTimeDigest
                                        missing={missing}
                                        weekMondayIso={weekMondayIso}
                                        onSendDigest={onSendDigest ?? (() => {})}
                                        onDesignerClick={openDrilldown}
                                    />
                                )}
                                {outliers.length > 0 && (
                                    <OutlierCoachingCard outliers={outliers} onSendMessage={onSendCoachingMessage} />
                                )}
                            </div>
                        )
                    }
                    if (active === 'trends') {
                        return (
                            <TrendsTab
                                rows={trainingGaps}
                                onDesignerClick={openDrilldown}
                                hoursVsSold={hoursVsSold}
                                productionRate={productionRate}
                            />
                        )
                    }
                    return null
                }}
            </TabsShell>

            <DesignerDrilldown
                isOpen={drilldownDesignerId !== null}
                onClose={() => setDrilldownDesignerId(null)}
                designerId={drilldownDesignerId}
                weekMondayIso={weekMondayIso}
                allEntries={allEntries}
                summerFridaysActive={summerFridaysActive}
            />
        </>
    )
}

/** TT.44 · Human-readable week range · 'Aug 31 – Sep 6, 2026'. */
function formatWeekRange(mondayIso: string, sundayIso: string): string {
    const mon = new Date(mondayIso)
    const sun = new Date(sundayIso)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const monStr = mon.toLocaleDateString('en-US', opts)
    const sunStr = sun.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    return `${monStr} – ${sunStr}`
}

