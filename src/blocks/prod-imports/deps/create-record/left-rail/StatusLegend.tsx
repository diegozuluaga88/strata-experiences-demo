import type { PreflightSummary } from '../types'

interface StatusLegendProps {
    summary: PreflightSummary
}

interface LegendRowProps {
    color: string
    label: string
    count: number
    hint: string
}

function LegendRow({ color, label, count, hint }: LegendRowProps) {
    return (
        <div title={hint} className="flex items-center gap-1.5 min-w-0">
            <span className={`size-2 rounded-full shrink-0 ${color}`} />
            <span className="text-muted-foreground truncate">{label}</span>
            <span className="ml-auto text-muted-foreground/60 font-mono">{count}</span>
        </div>
    )
}

export default function StatusLegend({ summary }: StatusLegendProps) {
    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
            <LegendRow color="bg-green-500 dark:bg-green-400" label="Ready" count={summary.resolved} hint="Fields ready to publish (resolved or AI-matched and accepted)" />
            <LegendRow color="bg-amber-500 dark:bg-amber-400" label="Low conf." count={summary.aiUncertain} hint="AI proposed a value but with low confidence — please confirm" />
            <LegendRow color="bg-amber-500 dark:bg-amber-400" label="Partial" count={summary.partial} hint="Multi-value fields where some entries didn't match the catalog" />
            <LegendRow color="bg-red-500 dark:bg-red-400" label="Missing" count={summary.unresolved} hint="Required fields with no valid value — must be resolved" />
            <LegendRow color="bg-red-500 dark:bg-red-400" label="Bad format" count={summary.coercionErrors} hint="Value couldn't be parsed (invalid date, email, number…) — fix to continue" />
            <LegendRow color="bg-zinc-300 dark:bg-zinc-700" label="Not sent" count={summary.unmapped} hint="Fields outside the Orderbahn schema — won't be stored on the record" />
        </div>
    )
}
