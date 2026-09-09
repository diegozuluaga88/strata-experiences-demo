import type { PreflightSummary } from '../types'

interface SegmentedBarProps {
    summary: PreflightSummary
}

export default function SegmentedBar({ summary }: SegmentedBarProps) {
    const total = summary.total || 1
    const segments: Array<{ key: string; count: number; cls: string }> = [
        { key: 'r', count: summary.resolved, cls: 'bg-green-500 dark:bg-green-400' },
        { key: 'au', count: summary.aiUncertain, cls: 'bg-amber-500 dark:bg-amber-400' },
        { key: 'p', count: summary.partial, cls: 'bg-amber-500 dark:bg-amber-400' },
        { key: 'u', count: summary.unresolved, cls: 'bg-red-500 dark:bg-red-400' },
        { key: 'c', count: summary.coercionErrors, cls: 'bg-red-500 dark:bg-red-400' },
        { key: 'um', count: summary.unmapped, cls: 'bg-zinc-300 dark:bg-zinc-700' },
    ].filter(s => s.count > 0)

    return (
        <div className="h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex gap-[2px]">
            {segments.map(s => (
                <span
                    key={s.key}
                    className={`block h-full ${s.cls}`}
                    style={{ width: `${(s.count / total) * 100}%` }}
                />
            ))}
        </div>
    )
}
