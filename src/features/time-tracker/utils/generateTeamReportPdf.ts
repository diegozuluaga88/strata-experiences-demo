// TT.44 · Diego 2026-09-08 · Team weekly report PDF generator.
// Dynamic import de jspdf (~200KB) para no bloatear el initial bundle.
// Layout A4 portrait, native jspdf primitives (no html2canvas · más rápido +
// mantiene el text seleccionable/copyable).

import type {
    MissingTimeInfo,
    Outlier,
    TrainingGapRow,
    UtilizationCell,
    DesignerWeekTotals,
    HoursVsSold,
    BucketRate,
} from '../data/managerInsights'

export interface TeamReportData {
    weekMondayIso: string
    weekLabel: string        // 'Aug 31 – Sep 6, 2026'
    generatedAt: string      // ISO timestamp
    weekTotals: DesignerWeekTotals[]
    missing: MissingTimeInfo[]
    outliers: Outlier[]
    trainingGaps: TrainingGapRow[]
    utilGrid: UtilizationCell[][]
    weekDays: string[]       // ISO YYYY-MM-DD × 7
    hoursVsSold: HoursVsSold
    productionRate: BucketRate[]
    getName: (designerId: string) => string
}

// ─── Colors (RGB · matches Strata tokens roughly) ─────────────
const C = {
    text:            [15, 23, 42]       as [number, number, number], // slate-900
    mutedText:       [100, 116, 139]    as [number, number, number], // slate-500
    border:          [226, 232, 240]    as [number, number, number], // slate-200
    headerBg:        [248, 250, 252]    as [number, number, number], // slate-50
    success:         [22, 163, 74]      as [number, number, number], // green-600
    successSoft:     [220, 252, 231]    as [number, number, number], // green-100
    warning:         [217, 119, 6]      as [number, number, number], // amber-600
    warningSoft:     [254, 243, 199]    as [number, number, number], // amber-100
    destructive:     [220, 38, 38]      as [number, number, number], // red-600
    destructiveSoft: [254, 226, 226]    as [number, number, number], // red-100
    infoSoft:        [219, 234, 254]    as [number, number, number], // blue-100
    primary:         [17, 24, 39]       as [number, number, number], // near-black
}
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Main entry point · returns a Blob URL ready to open in a new tab. */
export async function generateTeamReportPdf(data: TeamReportData): Promise<Blob> {
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 40
    const contentW = pageW - margin * 2

    let y = margin

    // ─── Section: Header ─────────────────────────────────────
    y = renderHeader(pdf, data, margin, contentW, y)
    y += 16

    // ─── Section: Team summary KPIs ──────────────────────────
    y = renderTeamKpis(pdf, data, margin, contentW, y)
    y += 20

    // ─── Section: Utilization heatmap ────────────────────────
    y = ensurePage(pdf, y, 180, pageH, margin)
    y = renderSectionTitle(pdf, 'Utilization heatmap', 'Daily hours vs each designer\'s daily capacity', margin, y)
    y += 8
    y = renderHeatmapTable(pdf, data, margin, contentW, y, pageH)
    y += 20

    // ─── Section: Attention (Missing + Long sessions) ────────
    y = ensurePage(pdf, y, 100, pageH, margin)
    y = renderSectionTitle(pdf, 'Attention needed', 'Behind target + long sessions this week', margin, y)
    y += 8
    y = renderMissingTable(pdf, data, margin, contentW, y, pageH)
    y += 12
    y = renderOutliersTable(pdf, data, margin, contentW, y, pageH)
    y += 20

    // ─── Section: Trends ─────────────────────────────────────
    y = ensurePage(pdf, y, 100, pageH, margin)
    y = renderSectionTitle(pdf, 'Trends', '4-week velocity + hours vs sold + production rate', margin, y)
    y += 8
    y = renderTrainingGapsTable(pdf, data, margin, contentW, y, pageH)
    y += 12
    y = ensurePage(pdf, y, 80, pageH, margin)
    y = renderTrendsSummary(pdf, data, margin, contentW, y)

    // ─── Footer on all pages ────────────────────────────────
    renderFooter(pdf, data)

    return pdf.output('blob')
}

// ─────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────

type PDF = ReturnType<typeof _pdfType>
declare function _pdfType(): import('jspdf').jsPDF
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any

function renderHeader(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number): number {
    // Small brand mark
    pdf.setFillColor(...C.primary)
    pdf.rect(margin, y, 4, 24, 'F')
    pdf.setTextColor(...C.text)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.text('Time Tracker · Team weekly report', margin + 12, y + 16)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...C.mutedText)
    pdf.text(`Week of ${data.weekLabel}`, margin + 12, y + 30)
    const stampW = pdf.getTextWidth(`Generated ${formatStamp(data.generatedAt)}`)
    pdf.text(`Generated ${formatStamp(data.generatedAt)}`, margin + contentW - stampW, y + 30)

    // Divider
    pdf.setDrawColor(...C.border)
    pdf.setLineWidth(0.5)
    pdf.line(margin, y + 40, margin + contentW, y + 40)
    return y + 46
}

function renderTeamKpis(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number): number {
    const totals = data.weekTotals
    const totalHrs = totals.reduce((s, t) => s + t.total, 0)
    const totalBill = totals.reduce((s, t) => s + t.billable, 0)
    const totalCap = totals.reduce((s, t) => s + t.capacity, 0)
    const billablePct = totalHrs > 0 ? Math.round((totalBill / totalHrs) * 100) : 0
    const utilPct = totalCap > 0 ? Math.round((totalHrs / totalCap) * 100) : 0
    const activeDesigners = totals.filter(t => t.total > 0).length

    const kpis: [string, string, string][] = [
        ['Total hours', `${totalHrs.toFixed(1)}h`, `of ${totalCap}h capacity`],
        ['Billable', `${billablePct}%`, `${totalBill.toFixed(1)}h billable`],
        ['Avg utilization', `${utilPct}%`, `across the team`],
        ['Active designers', String(activeDesigners), `of ${totals.length} on roster`],
    ]

    const gap = 8
    const cardW = (contentW - gap * 3) / 4
    const cardH = 56

    kpis.forEach(([label, value, sub], i) => {
        const x = margin + i * (cardW + gap)
        pdf.setDrawColor(...C.border)
        pdf.setFillColor(...C.headerBg)
        pdf.roundedRect(x, y, cardW, cardH, 4, 4, 'FD')

        pdf.setTextColor(...C.mutedText)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        pdf.text(label.toUpperCase(), x + 8, y + 12)

        pdf.setTextColor(...C.text)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.text(value, x + 8, y + 32)

        pdf.setTextColor(...C.mutedText)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(sub, x + 8, y + 48)
    })

    return y + cardH
}

function renderSectionTitle(pdf: P, title: string, subtitle: string, margin: number, y: number): number {
    pdf.setTextColor(...C.text)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(title, margin, y + 12)
    pdf.setTextColor(...C.mutedText)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(subtitle, margin, y + 24)
    return y + 28
}

function renderHeatmapTable(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number, pageH: number): number {
    const rows = data.utilGrid
    const nameColW = 100
    const cellW = (contentW - nameColW) / 7
    const rowH = 20
    const headerH = 18

    // Header row
    pdf.setFillColor(...C.headerBg)
    pdf.rect(margin, y, contentW, headerH, 'F')
    pdf.setDrawColor(...C.border)
    pdf.rect(margin, y, contentW, headerH, 'S')
    pdf.setTextColor(...C.mutedText)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text('DESIGNER', margin + 6, y + 12)
    data.weekDays.forEach((iso, i) => {
        const day = DAY_LABELS[i]
        const d = new Date(iso).getDate()
        pdf.text(`${day} ${d}`, margin + nameColW + i * cellW + cellW / 2, y + 12, { align: 'center' })
    })
    y += headerH

    // Body rows
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    for (const row of rows) {
        y = ensurePage(pdf, y, rowH, pageH, margin)
        pdf.setDrawColor(...C.border)
        pdf.setTextColor(...C.text)
        pdf.rect(margin, y, contentW, rowH, 'S')
        pdf.text(data.getName(row[0].designerId), margin + 6, y + 14)
        row.forEach((cell, i) => {
            const cx = margin + nameColW + i * cellW
            const cellTone: [number, number, number] | null =
                cell.tier === 'over' ? C.infoSoft :
                cell.tier === 'ok' ? C.successSoft :
                cell.tier === 'watch' ? C.warningSoft :
                cell.tier === 'below' ? C.destructiveSoft :
                null
            if (cellTone && cell.hoursLogged > 0) {
                pdf.setFillColor(...cellTone)
                pdf.rect(cx + 1, y + 1, cellW - 2, rowH - 2, 'F')
            }
            pdf.setTextColor(...C.text)
            if (cell.hoursLogged > 0) {
                pdf.text(`${cell.hoursLogged.toFixed(1)}h`, cx + cellW / 2, y + 12, { align: 'center' })
                pdf.setFontSize(6)
                pdf.setTextColor(...C.mutedText)
                pdf.text(`${cell.percent}%`, cx + cellW / 2, y + 18, { align: 'center' })
                pdf.setFontSize(8)
            } else {
                pdf.setTextColor(...C.mutedText)
                pdf.text('—', cx + cellW / 2, y + 14, { align: 'center' })
            }
        })
        y += rowH
    }
    return y
}

function renderMissingTable(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number, pageH: number): number {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...C.warning)
    pdf.text(`Missing time (${data.missing.length})`, margin, y + 10)
    y += 14
    if (data.missing.length === 0) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...C.mutedText)
        pdf.setFontSize(8)
        pdf.text('All designers on track this week.', margin, y + 10)
        return y + 14
    }
    y = renderTable(pdf, {
        cols: [
            { label: 'Designer', width: contentW * 0.4, align: 'left' },
            { label: 'Logged',   width: contentW * 0.2, align: 'right' },
            { label: 'Target',   width: contentW * 0.2, align: 'right' },
            { label: 'Behind',   width: contentW * 0.2, align: 'right' },
        ],
        rows: data.missing.map(m => [
            data.getName(m.designerId),
            `${m.hoursLogged.toFixed(1)}h`,
            `${m.capacityTarget.toFixed(1)}h`,
            `−${m.hoursMissing.toFixed(1)}h`,
        ]),
        toneCol: 3,
        toneColor: C.warning,
    }, margin, y, pageH)
    return y
}

function renderOutliersTable(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number, pageH: number): number {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...C.destructive)
    pdf.text(`Long sessions (${data.outliers.length})`, margin, y + 10)
    y += 14
    if (data.outliers.length === 0) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...C.mutedText)
        pdf.setFontSize(8)
        pdf.text('No sessions over 4h flagged this week.', margin, y + 10)
        return y + 14
    }
    y = renderTable(pdf, {
        cols: [
            { label: 'Designer',      width: contentW * 0.28, align: 'left' },
            { label: 'Task',          width: contentW * 0.30, align: 'left' },
            { label: 'Duration',      width: contentW * 0.15, align: 'right' },
            { label: 'Above avg',     width: contentW * 0.15, align: 'right' },
            { label: 'Tier',          width: contentW * 0.12, align: 'center' },
        ],
        rows: data.outliers.slice(0, 10).map(o => [
            data.getName(o.entry.designerId),
            o.entry.taskTypeId,
            `${(o.entry.durationMinutes / 60).toFixed(1)}h`,
            `+${o.hoursAboveAvg.toFixed(1)}h`,
            o.tier === 'red' ? 'Long' : 'Above',
        ]),
        toneCol: 4,
        toneColorByRow: data.outliers.slice(0, 10).map(o => o.tier === 'red' ? C.destructive : C.warning),
    }, margin, y, pageH)
    return y
}

function renderTrainingGapsTable(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number, pageH: number): number {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...C.text)
    pdf.text(`Training-gap trends (top 10 · |trend| ≥ 15%)`, margin, y + 10)
    y += 14
    const rows = data.trainingGaps.filter(g => Math.abs(g.trendPercent) >= 15).slice(0, 10)
    if (rows.length === 0) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...C.mutedText)
        pdf.setFontSize(8)
        pdf.text('No significant velocity shifts this window.', margin, y + 10)
        return y + 14
    }
    y = renderTable(pdf, {
        cols: [
            { label: 'Designer',    width: contentW * 0.28, align: 'left' },
            { label: 'Task',        width: contentW * 0.28, align: 'left' },
            { label: 'Now',         width: contentW * 0.14, align: 'right' },
            { label: 'Team avg',    width: contentW * 0.14, align: 'right' },
            { label: 'Δ 4wk',       width: contentW * 0.16, align: 'right' },
        ],
        rows: rows.map(g => [
            data.getName(g.designerId),
            g.taskTypeId,
            `${(g.points[3].avgMinutes / 60).toFixed(2)}h`,
            `${(g.teamAvgLatest / 60).toFixed(2)}h`,
            `${g.trendPercent > 0 ? '+' : ''}${g.trendPercent}%`,
        ]),
        toneCol: 4,
        toneColorByRow: rows.map(g => g.trendPercent > 0 ? C.warning : C.success),
    }, margin, y, pageH)
    return y
}

function renderTrendsSummary(pdf: P, data: TeamReportData, margin: number, contentW: number, y: number): number {
    const gap = 8
    const cardW = (contentW - gap) / 2
    const cardH = 66

    // Hours vs sold card
    pdf.setDrawColor(...C.border)
    pdf.setFillColor(...C.headerBg)
    pdf.roundedRect(margin, y, cardW, cardH, 4, 4, 'FD')
    pdf.setTextColor(...C.mutedText)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text('HOURS VS SOLD', margin + 8, y + 12)
    pdf.setTextColor(...C.text)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(`Logged   ${data.hoursVsSold.logged.toFixed(1)}h`, margin + 8, y + 28)
    pdf.text(`Sold pace ${data.hoursVsSold.sold.toFixed(1)}h`, margin + 8, y + 42)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    const varianceTone = data.hoursVsSold.variancePercent > 110 ? C.destructive
        : data.hoursVsSold.variancePercent < 90 ? C.warning : C.success
    pdf.setTextColor(...varianceTone)
    pdf.text(`${data.hoursVsSold.variancePercent}%`, margin + cardW - 8, y + 40, { align: 'right' })
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.text('variance', margin + cardW - 8, y + 52, { align: 'right' })

    // Production rate card
    const x2 = margin + cardW + gap
    pdf.setDrawColor(...C.border)
    pdf.setFillColor(...C.headerBg)
    pdf.roundedRect(x2, y, cardW, cardH, 4, 4, 'FD')
    pdf.setTextColor(...C.mutedText)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text('PRODUCTION RATE · BY SIZE', x2 + 8, y + 12)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...C.text)
    data.productionRate.forEach((b, i) => {
        const rowY = y + 26 + i * 12
        pdf.text(b.label, x2 + 8, rowY)
        pdf.text(`${b.avgHoursPerProject.toFixed(1)}h avg · ${b.projectCount} proj`, x2 + cardW - 8, rowY, { align: 'right' })
    })

    return y + cardH
}

function renderFooter(pdf: P, data: TeamReportData) {
    const pageCount = pdf.internal.pages.length - 1
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(...C.mutedText)
        pdf.text(`Strata Time Tracker · ${data.weekLabel}`, 40, pageH - 20)
        pdf.text(`Page ${i} of ${pageCount}`, pageW - 40, pageH - 20, { align: 'right' })
    }
}

// ─────────────────────────────────────────────────────────────
// Generic table primitive
// ─────────────────────────────────────────────────────────────
interface TableCol { label: string; width: number; align: 'left' | 'right' | 'center' }
interface TableSpec {
    cols: TableCol[]
    rows: string[][]
    toneCol?: number
    toneColor?: [number, number, number]
    toneColorByRow?: [number, number, number][]
}

function renderTable(pdf: P, spec: TableSpec, margin: number, y: number, pageH: number): number {
    const headerH = 14
    const rowH = 16
    // header
    pdf.setFillColor(...C.headerBg)
    pdf.rect(margin, y, spec.cols.reduce((s, c) => s + c.width, 0), headerH, 'F')
    pdf.setTextColor(...C.mutedText)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    let cx = margin
    for (const col of spec.cols) {
        const tx = col.align === 'right' ? cx + col.width - 6
            : col.align === 'center' ? cx + col.width / 2
            : cx + 6
        pdf.text(col.label.toUpperCase(), tx, y + 10, { align: col.align })
        cx += col.width
    }
    y += headerH
    // body
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    spec.rows.forEach((row, ri) => {
        y = ensurePage(pdf, y, rowH, pageH, margin)
        pdf.setDrawColor(...C.border)
        pdf.line(margin, y + rowH, margin + spec.cols.reduce((s, c) => s + c.width, 0), y + rowH)
        let cxi = margin
        row.forEach((cell, ci) => {
            const col = spec.cols[ci]
            const tx = col.align === 'right' ? cxi + col.width - 6
                : col.align === 'center' ? cxi + col.width / 2
                : cxi + 6
            if (ci === spec.toneCol && (spec.toneColor || spec.toneColorByRow)) {
                const tone = spec.toneColorByRow?.[ri] ?? spec.toneColor!
                pdf.setTextColor(...tone)
                pdf.setFont('helvetica', 'bold')
            } else {
                pdf.setTextColor(...C.text)
                pdf.setFont('helvetica', 'normal')
            }
            pdf.text(cell, tx, y + 11, { align: col.align })
            cxi += col.width
        })
        y += rowH
    })
    return y
}

// ─────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────
function ensurePage(pdf: P, y: number, neededH: number, pageH: number, margin: number): number {
    if (y + neededH > pageH - 40) {
        pdf.addPage()
        return margin
    }
    return y
}

function formatStamp(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
