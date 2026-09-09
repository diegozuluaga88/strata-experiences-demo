import { Search, X } from 'lucide-react'
import type { DeprecationReason, DatePreset } from './types'
import { DEPRECATION_REASON_META, DATE_PRESETS } from './types'

export interface DeprecatedFilterState {
    search: string
    reasons: Set<DeprecationReason>
    datePreset: DatePreset
}

export const EMPTY_FILTERS: DeprecatedFilterState = {
    search: '',
    reasons: new Set<DeprecationReason>(),
    datePreset: 'all',
}

interface DeprecatedFiltersProps {
    state: DeprecatedFilterState
    onChange: (next: DeprecatedFilterState) => void
    showingCount: number
    totalCount: number
}

const ALL_REASONS: DeprecationReason[] = [
    'superseded', 'cancelled', 'duplicate', 'vendor_correction',
    'merged', 'failed_processing', 'manually_archived', 'obsolete', 'other',
]

export default function DeprecatedFilters({ state, onChange, showingCount, totalCount }: DeprecatedFiltersProps) {
    const hasActive = state.search.trim() !== '' || state.reasons.size > 0 || state.datePreset !== 'all'

    const toggleReason = (r: DeprecationReason) => {
        const next = new Set(state.reasons)
        if (next.has(r)) next.delete(r)
        else next.add(r)
        onChange({ ...state, reasons: next })
    }

    return (
        <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[260px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, vendor or OCR ID…"
                        value={state.search}
                        onChange={(e) => onChange({ ...state, search: e.target.value })}
                        title="Search archived documents by filename, vendor or OCR ID"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                </div>

                {/* Date range */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    {DATE_PRESETS.map(p => {
                        const active = state.datePreset === p.id
                        return (
                            <button
                                key={p.id}
                                onClick={() => onChange({ ...state, datePreset: p.id })}
                                title={`Show documents archived in ${p.label.toLowerCase()}`}
                                className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                                    active
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {p.label}
                            </button>
                        )
                    })}
                </div>

                {/* Counter + clear */}
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-[12px] text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{showingCount}</span> of <span className="font-semibold text-foreground">{totalCount}</span>
                    </span>
                    {hasActive && (
                        <button
                            onClick={() => onChange(EMPTY_FILTERS)}
                            title="Clear all active filters"
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Reason chips — multi-select */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mr-1">Reason</span>
                {ALL_REASONS.map(r => {
                    const meta = DEPRECATION_REASON_META[r]
                    const active = state.reasons.has(r)
                    return (
                        <button
                            key={r}
                            onClick={() => toggleReason(r)}
                            title={meta.description}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                                active
                                    ? meta.badge + ' ring-1 ring-foreground/20'
                                    : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {meta.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
