import type { PreflightSummary, RecordType } from '../types'
import { configFor } from '../recordTypeConfig'
import ProgressRing from './ProgressRing'
import SegmentedBar from './SegmentedBar'
import StatusLegend from './StatusLegend'

export type PaneView = 'header' | 'lineItems' | 'extras'

interface PreflightLeftRailProps {
    recordType: RecordType
    documentId: string
    vendor: string
    summary: PreflightSummary
}

export default function PreflightLeftRail({
    recordType,
    documentId,
    vendor,
    summary,
}: PreflightLeftRailProps) {
    const pct = Math.round((summary.resolved / (summary.total || 1)) * 100)
    const cfg = configFor(recordType)
    const TypeIcon = cfg.icon

    return (
        <div className="h-full w-[300px] shrink-0 border-r border-border bg-gradient-to-b from-muted/40 to-muted/20 flex flex-col">
            {/* Brand block */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                        Create record
                    </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-brand-300 dark:bg-brand-500 text-zinc-900 shrink-0">
                        <TypeIcon className="size-4" />
                    </div>
                    <div className="text-[19px] font-medium tracking-tight text-foreground leading-tight">
                        {cfg.label}
                    </div>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                    {vendor} · <span className="font-mono text-foreground/80">{documentId}</span>
                </div>
            </div>

            {/* Progress block — global preflight overview */}
            <div className="px-5 py-5 flex-1 overflow-y-auto scrollbar-minimal">
                <div className="flex items-center gap-4">
                    <ProgressRing pct={pct} />
                    <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-foreground">Preflight</div>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5">
                            {summary.resolved} of {summary.total} ready
                        </div>
                        <div className="mt-2">
                            <SegmentedBar summary={summary} />
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <StatusLegend summary={summary} />
                </div>
            </div>
        </div>
    )
}
