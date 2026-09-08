// TT.6 · Diego 2026-09-03 · Manager Dashboard selectors.
// Pure functions · zero side-effects · consumidas por TeamView.tsx
// y sus sub-components (heatmap, outlier cards, missing-time digest,
// training-gap sparklines, drill-down).
//
// Toda la lógica de detección vive aquí para que sea reutilizable +
// testeable · y para que los components sean puramente presentacionales.

import { DESIGNER_IDS, DESIGNER_CAPACITY_HOURS, sumHours, entriesForDesignerRange, type TimeEntry, type DesignerId } from './timeEntries'
import { getTaskType } from './taskTypes'
import { TODAY_ISO } from './projects'

// ============================================================
// Date helpers (local to keep this file self-contained)
// ============================================================
export function addDaysIso(iso: string, n: number): string {
    const d = new Date(iso)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
}
export function mondayOf(iso: string): string {
    const d = new Date(iso)
    const dow = d.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
}
/** Week days as ISO array [Mon..Sun]. */
export function weekDays(mondayIso: string): string[] {
    return Array.from({ length: 7 }).map((_, i) => addDaysIso(mondayIso, i))
}

// ============================================================
// Missing-time detection (pain #1)
// ============================================================
export interface MissingTimeInfo {
    designerId: DesignerId
    hoursLogged: number
    capacityTarget: number
    hoursMissing: number
}

/**
 * Detects designers whose weekly hours are < 85% of their capacity.
 * McKinley's mental model: "3 days by Wed EOD, full week by Sunday".
 * Only counts weekdays passed (or the full week if we're past Sunday).
 * `summerFridaysActive` reduces capacity by 4h.
 */
export function detectMissingTime(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    summerFridaysActive = false,
    todayIso: string = TODAY_ISO
): MissingTimeInfo[] {
    const days = weekDays(weekMondayIso)
    const today = new Date(todayIso).getTime()
    const weekStart = new Date(days[0]).getTime()
    const weekEnd = new Date(days[6]).getTime()
    // How many weekdays should have entries by now?
    let weekdaysExpected = 5
    if (today >= weekStart && today <= weekEnd) {
        const dowToday = Math.max(1, Math.min(5, new Date(todayIso).getDay()))
        weekdaysExpected = dowToday
    }
    const result: MissingTimeInfo[] = []
    for (const designerId of DESIGNER_IDS) {
        const baseCapacity = DESIGNER_CAPACITY_HOURS[designerId] ?? 40
        const capacity = summerFridaysActive ? Math.max(0, baseCapacity - 4) : baseCapacity
        const dailyTarget = capacity / 5
        const capacityTarget = dailyTarget * weekdaysExpected
        const hoursLogged = sumHours(entriesForDesignerRange(designerId, days[0], days[6], allEntries))
        if (hoursLogged < capacityTarget * 0.85) {
            result.push({
                designerId,
                hoursLogged,
                capacityTarget,
                hoursMissing: Math.max(0, capacityTarget - hoursLogged),
            })
        }
    }
    return result.sort((a, b) => b.hoursMissing - a.hoursMissing)
}

// ============================================================
// Outlier detection (pain #6)
// ============================================================
export type OutlierTier = 'amber' | 'red'
export interface Outlier {
    entry: TimeEntry
    tier: OutlierTier
    hoursAboveAvg: number
}

/**
 * Detects single entries > 4h (amber) or > 6h (red) in the given week.
 * Also computes "hours above avg" using the designer's 4-week baseline
 * for the same task-type · for coaching copy context.
 */
export function detectOutliers(
    weekMondayIso: string,
    allEntries: TimeEntry[]
): Outlier[] {
    const days = weekDays(weekMondayIso)
    const weekEntries = allEntries.filter(e => e.date >= days[0] && e.date <= days[6])
    const AMBER_MIN = 4 * 60
    const RED_MIN = 6 * 60
    const outliers: Outlier[] = []
    for (const entry of weekEntries) {
        if (entry.durationMinutes < AMBER_MIN) continue
        const tier: OutlierTier = entry.durationMinutes >= RED_MIN ? 'red' : 'amber'
        // 4-week baseline for same designer × task-type
        const baselineStart = addDaysIso(weekMondayIso, -28)
        const baselineEnd = addDaysIso(weekMondayIso, -1)
        const baseline = allEntries.filter(e =>
            e.designerId === entry.designerId &&
            e.taskTypeId === entry.taskTypeId &&
            e.date >= baselineStart && e.date <= baselineEnd
        )
        const avgMinutes = baseline.length > 0
            ? baseline.reduce((s, e) => s + e.durationMinutes, 0) / baseline.length
            : entry.durationMinutes
        const hoursAboveAvg = Math.max(0, (entry.durationMinutes - avgMinutes) / 60)
        outliers.push({ entry, tier, hoursAboveAvg })
    }
    return outliers.sort((a, b) => (b.tier === 'red' ? 1 : 0) - (a.tier === 'red' ? 1 : 0) || b.entry.durationMinutes - a.entry.durationMinutes)
}

// ============================================================
// Parallel-work detection (TT.5 · postergado a Fase 5)
// ============================================================
export interface ParallelPair {
    designerId: DesignerId
    date: string
    entries: TimeEntry[]  // 2+ entries that overlap
}

/** Groups of entries by same designer + same day that overlap in time. */
export function detectParallelWork(
    weekMondayIso: string,
    allEntries: TimeEntry[]
): ParallelPair[] {
    const days = weekDays(weekMondayIso)
    const groups: Map<string, TimeEntry[]> = new Map()
    for (const e of allEntries) {
        if (e.date < days[0] || e.date > days[6]) continue
        const k = `${e.designerId}::${e.date}`
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k)!.push(e)
    }
    const pairs: ParallelPair[] = []
    for (const [k, dayEntries] of groups) {
        if (dayEntries.length < 2) continue
        // Find entries with startMinutesFromMidnight that overlap
        const withStart = dayEntries.filter(e => e.startMinutesFromMidnight != null)
        const overlapping: TimeEntry[] = []
        for (let i = 0; i < withStart.length; i++) {
            const a = withStart[i]
            const aStart = a.startMinutesFromMidnight!
            const aEnd = aStart + a.durationMinutes
            for (let j = i + 1; j < withStart.length; j++) {
                const b = withStart[j]
                const bStart = b.startMinutesFromMidnight!
                const bEnd = bStart + b.durationMinutes
                if (aStart < bEnd && bStart < aEnd) {
                    if (!overlapping.includes(a)) overlapping.push(a)
                    if (!overlapping.includes(b)) overlapping.push(b)
                }
            }
        }
        if (overlapping.length >= 2) {
            const [designerId, date] = k.split('::')
            pairs.push({ designerId: designerId as DesignerId, date, entries: overlapping })
        }
    }
    return pairs
}

// ============================================================
// Utilization heatmap data (day × designer)
// ============================================================
export interface UtilizationCell {
    designerId: DesignerId
    dateIso: string
    hoursLogged: number
    dailyCapacity: number
    percent: number  // 0..∞ (>100 = over)
    /** Color tier per Toggl thresholds. */
    tier: 'over' | 'ok' | 'watch' | 'below' | 'nodata'
}

/**
 * Builds a full day × designer grid.
 * Thresholds per benchmark:
 *  - > 110% overwork (over/purple)
 *  - ≥ 80% on-target (ok/green)
 *  - 70-79% watch (amber)
 *  - < 70% below (red)
 *  - 0h · no data (muted)
 */
export function buildUtilizationGrid(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    summerFridaysActive = false
): UtilizationCell[][] {
    const days = weekDays(weekMondayIso)
    return DESIGNER_IDS.map(designerId => {
        const baseCapacity = DESIGNER_CAPACITY_HOURS[designerId] ?? 40
        const capacity = summerFridaysActive ? Math.max(0, baseCapacity - 4) : baseCapacity
        const dailyCapacity = capacity / 5
        return days.map(dateIso => {
            const entries = allEntries.filter(e => e.designerId === designerId && e.date === dateIso)
            const hoursLogged = sumHours(entries)
            const percent = dailyCapacity > 0 ? (hoursLogged / dailyCapacity) * 100 : 0
            let tier: UtilizationCell['tier'] = 'nodata'
            if (hoursLogged === 0) tier = 'nodata'
            else if (percent > 110) tier = 'over'
            else if (percent >= 80) tier = 'ok'
            else if (percent >= 70) tier = 'watch'
            else tier = 'below'
            return { designerId, dateIso, hoursLogged, dailyCapacity, percent, tier }
        })
    })
}

// ============================================================
// Weekly billable vs internal split (per designer)
// ============================================================
export interface DesignerWeekTotals {
    designerId: DesignerId
    billable: number
    internal: number
    total: number
    capacity: number
    percent: number
}
export function buildDesignerWeekTotals(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    summerFridaysActive = false
): DesignerWeekTotals[] {
    const days = weekDays(weekMondayIso)
    return DESIGNER_IDS.map(designerId => {
        const baseCapacity = DESIGNER_CAPACITY_HOURS[designerId] ?? 40
        const capacity = summerFridaysActive ? Math.max(0, baseCapacity - 4) : baseCapacity
        const weekEntries = entriesForDesignerRange(designerId, days[0], days[6], allEntries)
        const billable = sumHours(weekEntries.filter(e => e.billable))
        const internal = sumHours(weekEntries.filter(e => !e.billable))
        const total = billable + internal
        const percent = capacity > 0 ? Math.round((total / capacity) * 100) : 0
        return { designerId, billable, internal, total, capacity, percent }
    })
}

// ============================================================
// Training-gap sparklines (whitespace #3)
// ============================================================
export interface VelocityPoint {
    weekOffset: number  // 0 = 4 weeks ago, 3 = this week
    avgMinutes: number  // avg for this designer × task-type in that week
    sampleCount: number
}
export interface TrainingGapRow {
    designerId: DesignerId
    taskTypeId: string
    points: VelocityPoint[]  // 4 points (4 weeks)
    /** Delta % from oldest week to newest (positive = slower / negative = faster). */
    trendPercent: number
    teamAvgLatest: number  // avg minutes across all designers for this task in current week
}

/**
 * For a set of task-types (usually the design-heavy ones), build a 4-week
 * velocity table per designer showing trend. Positive trend = designer taking
 * longer on the task · potential training gap signal.
 */
export function buildTrainingGaps(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    taskTypeIds: string[] = ['block-plan', 'floor-plan', 'powerpoint', 'renderings']
): TrainingGapRow[] {
    const rows: TrainingGapRow[] = []
    for (const designerId of DESIGNER_IDS) {
        for (const taskTypeId of taskTypeIds) {
            const points: VelocityPoint[] = []
            for (let wk = 3; wk >= 0; wk--) {
                const weekStart = addDaysIso(weekMondayIso, -7 * wk)
                const weekEnd = addDaysIso(weekStart, 6)
                const entries = allEntries.filter(e =>
                    e.designerId === designerId &&
                    e.taskTypeId === taskTypeId &&
                    e.date >= weekStart && e.date <= weekEnd
                )
                const avgMinutes = entries.length > 0
                    ? entries.reduce((s, e) => s + e.durationMinutes, 0) / entries.length
                    : 0
                // weekOffset · 3 = current, 0 = oldest
                points.push({ weekOffset: 3 - wk, avgMinutes, sampleCount: entries.length })
            }
            // Trend: compare first non-zero week to last non-zero week
            const first = points.find(p => p.sampleCount > 0)
            const last = [...points].reverse().find(p => p.sampleCount > 0)
            const trendPercent = first && last && first.avgMinutes > 0
                ? Math.round(((last.avgMinutes - first.avgMinutes) / first.avgMinutes) * 100)
                : 0
            // Team avg for this task in current week
            const currentWeekEnd = addDaysIso(weekMondayIso, 6)
            const currentTeamEntries = allEntries.filter(e =>
                e.taskTypeId === taskTypeId &&
                e.date >= weekMondayIso && e.date <= currentWeekEnd
            )
            const teamAvgLatest = currentTeamEntries.length > 0
                ? currentTeamEntries.reduce((s, e) => s + e.durationMinutes, 0) / currentTeamEntries.length
                : 0
            // Only include rows where designer actually has data
            const anyData = points.some(p => p.sampleCount > 0)
            if (anyData) rows.push({ designerId, taskTypeId, points, trendPercent, teamAvgLatest })
        }
    }
    // Rank by absolute trend (largest change first · positive or negative)
    return rows.sort((a, b) => Math.abs(b.trendPercent) - Math.abs(a.trendPercent))
}

// TT.42 · buildAttentionItems + AttentionItem eliminados junto con el
// AttentionNeededCard aggregate deprecated · las cards fuente
// (MissingTimeDigest · OutlierCoachingCard · TrainingGapSparklines) ya
// consumen sus selectors directos · el aggregate solo introducía doble-run
// de detectMissingTime / detectOutliers / buildTrainingGaps.

// ============================================================
// TT.43 · Utilization tab · filters + budget/value charts (pain #2)
// ============================================================
import { PROJECTS, getProject, type Project, type Company } from './projects'

export type SizeBucket = 'small' | 'medium' | 'large'    // $0-10K / $10-100K / $100K+

export interface UtilizationFilters {
    company: Company | 'all'
    billable: 'all' | 'billable' | 'internal'
    sizeBucket: SizeBucket | 'all'
    salesRep: string | 'all'   // salesRepName exact match
}

export const DEFAULT_FILTERS: UtilizationFilters = {
    company: 'all',
    billable: 'all',
    sizeBucket: 'all',
    salesRep: 'all',
}

/** Project size bucket by contractValue · matches benchmark:223 ranges. */
export function projectSizeBucket(p: Project): SizeBucket {
    const v = p.contractValue ?? 0
    if (v < 10000) return 'small'
    if (v < 100000) return 'medium'
    return 'large'
}

/** True if the project passes ALL the non-billable filters (company, size, sales rep). */
function projectMatchesFilters(p: Project, f: UtilizationFilters): boolean {
    if (f.company !== 'all' && p.company !== f.company) return false
    if (f.sizeBucket !== 'all' && projectSizeBucket(p) !== f.sizeBucket) return false
    if (f.salesRep !== 'all' && p.salesRepName !== f.salesRep) return false
    return true
}

/** True if the entry passes all filters (project+billable). */
export function entryMatchesFilters(entry: TimeEntry, f: UtilizationFilters): boolean {
    if (f.billable === 'billable' && !entry.billable) return false
    if (f.billable === 'internal' && entry.billable) return false
    if (f.company !== 'all' || f.sizeBucket !== 'all' || f.salesRep !== 'all') {
        const project = getProject(entry.projectId)
        if (!project) return false
        return projectMatchesFilters(project, f)
    }
    return true
}

// ------------------------------------------------------------
// Filter option catalogs (for the dropdowns)
// ------------------------------------------------------------
export interface FilterOptions {
    companies: Company[]           // 3 fixed
    salesReps: string[]            // deduplicated from active projects
}

export function buildFilterOptions(): FilterOptions {
    const activeProjects = PROJECTS.filter(p => p.status === 'active' || p.status === 'delivered')
    const salesReps = Array.from(new Set(activeProjects.map(p => p.salesRepName))).sort()
    return {
        companies: ['Rightsize', 'Office Furniture Center', 'Mac Relocations'],
        salesReps,
    }
}

// ------------------------------------------------------------
// Chart 1 · Hours-vs-Sold (triple: logged / sold / variance %)
// benchmark:225 "3 KPI cards must-have" · sot:103-104
// "Sold" = budgetHours (proxy · docs no separan sold vs budget en detalle).
// ------------------------------------------------------------
export interface HoursVsSold {
    logged: number     // hours logged this week within filters
    sold: number       // budget hours proportional (see calc note)
    variancePercent: number      // (logged / sold) * 100
    projectCount: number
}

export function buildHoursVsSold(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    filters: UtilizationFilters
): HoursVsSold {
    const days = weekDays(weekMondayIso)
    const weekEntries = allEntries.filter(e => e.date >= days[0] && e.date <= days[6] && entryMatchesFilters(e, filters))
    const logged = sumHours(weekEntries)
    // "Sold" per week per project = budgetHours / 12 (assume ~3-month spread as heuristic).
    // Projects filtered to the ones that have entries this week matching filters.
    const projectIdsThisWeek = Array.from(new Set(weekEntries.map(e => e.projectId)))
    const activeProjects = projectIdsThisWeek
        .map(id => getProject(id))
        .filter((p): p is Project => !!p && (filters.company === 'all' || p.company === filters.company))
    const sold = activeProjects.reduce((s, p) => s + p.budgetHours / 12, 0)
    const variancePercent = sold > 0 ? Math.round((logged / sold) * 100) : 0
    return { logged, sold, variancePercent, projectCount: activeProjects.length }
}

// ------------------------------------------------------------
// Chart 2 · Production Rate by project size bucket
// benchmark:223 · avg hours logged per project in the bucket (this week).
// ------------------------------------------------------------
export interface BucketRate {
    bucket: SizeBucket
    label: string             // '$0-10K' etc
    avgHoursPerProject: number
    projectCount: number
    totalHours: number
}

const BUCKET_LABELS: Record<SizeBucket, string> = {
    small: '$0-10K',
    medium: '$10-100K',
    large: '$100K+',
}

export function buildProductionRateByBucket(
    weekMondayIso: string,
    allEntries: TimeEntry[],
    filters: UtilizationFilters
): BucketRate[] {
    const days = weekDays(weekMondayIso)
    const weekEntries = allEntries.filter(e => e.date >= days[0] && e.date <= days[6] && entryMatchesFilters(e, filters))
    // Group hours by project
    const hoursByProject = new Map<string, number>()
    for (const e of weekEntries) {
        hoursByProject.set(e.projectId, (hoursByProject.get(e.projectId) ?? 0) + e.durationMinutes / 60)
    }
    // Group by bucket
    const byBucket: Record<SizeBucket, { total: number; projects: Set<string> }> = {
        small: { total: 0, projects: new Set() },
        medium: { total: 0, projects: new Set() },
        large: { total: 0, projects: new Set() },
    }
    for (const [projectId, hours] of hoursByProject) {
        const p = getProject(projectId)
        if (!p) continue
        const bucket = projectSizeBucket(p)
        byBucket[bucket].total += hours
        byBucket[bucket].projects.add(projectId)
    }
    return (['small', 'medium', 'large'] as SizeBucket[]).map(bucket => {
        const stats = byBucket[bucket]
        const count = stats.projects.size
        return {
            bucket,
            label: BUCKET_LABELS[bucket],
            avgHoursPerProject: count > 0 ? stats.total / count : 0,
            projectCount: count,
            totalHours: stats.total,
        }
    })
}

// TT.43.2 · buildProjectBudgetStatus + buildBillableDonut eliminados junto
// con los componentes BudgetStatusTable + BillableDonut (Diego · 'solo los
// más relevantes según docs' · quedan Hours-vs-Sold + Production Rate en Trends).

// ------------------------------------------------------------
// Utility · filter the utilization grid using the same filters
// ------------------------------------------------------------
export function filterUtilizationEntries(
    allEntries: TimeEntry[],
    filters: UtilizationFilters
): TimeEntry[] {
    if (filters.company === 'all' && filters.billable === 'all' && filters.sizeBucket === 'all' && filters.salesRep === 'all') {
        return allEntries
    }
    return allEntries.filter(e => entryMatchesFilters(e, filters))
}

// ============================================================
// TT.43.1 · Trends tab · summary + team velocity chart
// ============================================================
export interface TrendsSummary {
    total: number             // total rows with data
    slower: number            // trend > 0
    faster: number            // trend < 0
    stable: number            // |trend| < 5
    avgAbsChange: number      // avg absolute change % across all rows
}

export function buildTrendsSummary(rows: TrainingGapRow[], significantThreshold = 15): TrendsSummary {
    const withData = rows.filter(r => r.points[3].sampleCount > 0)
    const significant = withData.filter(r => Math.abs(r.trendPercent) >= significantThreshold)
    const slower = significant.filter(r => r.trendPercent > 0).length
    const faster = significant.filter(r => r.trendPercent < 0).length
    const stable = withData.length - slower - faster
    const avgAbsChange = withData.length > 0
        ? Math.round(withData.reduce((s, r) => s + Math.abs(r.trendPercent), 0) / withData.length)
        : 0
    return { total: withData.length, slower, faster, stable, avgAbsChange }
}

// TT.43.2 · buildTeamVelocityTrend + TeamVelocityPoint eliminados · el team
// velocity chart fue removido del Trends tab por request de Diego (solo los
// más relevantes según docs).
