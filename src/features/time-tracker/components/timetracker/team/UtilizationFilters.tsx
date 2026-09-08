// TT.43.1 · Diego 2026-09-08 · Utilization filters · 1-row compact.
// Antes: card wrapper + title + 4 columns apiladas (~200px alto).
// Ahora: 1 row inline con 4 compact controls (~40px alto).

import { Filter, X } from 'lucide-react'
import type { UtilizationFilters, FilterOptions, SizeBucket } from '../../../data/managerInsights'
import { DEFAULT_FILTERS } from '../../../data/managerInsights'
import type { Company } from '../../../data/projects'

interface Props {
    value: UtilizationFilters
    onChange: (next: UtilizationFilters) => void
    options: FilterOptions
}

const COMPANY_LABEL: Record<Company | 'all', string> = {
    all: 'All companies',
    'Rightsize': 'Rightsize',
    'Office Furniture Center': 'OFC',
    'Mac Relocations': 'Mac Relocations',
}
const BILLABLE_LABEL: Record<'all' | 'billable' | 'internal', string> = {
    all: 'All work',
    billable: 'Billable only',
    internal: 'Internal only',
}
const SIZE_LABEL: Record<SizeBucket | 'all', string> = {
    all: 'All sizes',
    small: '$0-10K',
    medium: '$10-100K',
    large: '$100K+',
}

export default function UtilizationFiltersStrip({ value, onChange, options }: Props) {
    const set = <K extends keyof UtilizationFilters>(key: K, v: UtilizationFilters[K]) => {
        onChange({ ...value, [key]: v })
    }
    const reset = () => onChange(DEFAULT_FILTERS)
    const isFiltered = value.company !== 'all' || value.billable !== 'all' || value.sizeBucket !== 'all' || value.salesRep !== 'all'
    const activeCount = [value.company, value.billable, value.sizeBucket, value.salesRep].filter(v => v !== 'all').length

    return (
        <div className="flex items-center gap-2 flex-wrap px-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                <Filter className="h-3 w-3" />
                Filters
                {isFiltered && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] tabular-nums">{activeCount}</span>
                )}
            </div>

            <FilterSelect
                label="Company"
                value={value.company}
                onChange={(v) => set('company', v as Company | 'all')}
                options={[
                    { value: 'all', label: COMPANY_LABEL.all },
                    { value: 'Rightsize', label: 'Rightsize' },
                    { value: 'Office Furniture Center', label: 'OFC' },
                    { value: 'Mac Relocations', label: 'Mac Relocations' },
                ]}
                displayLabel={COMPANY_LABEL[value.company]}
                highlighted={value.company !== 'all'}
            />

            <FilterSelect
                label="Billable"
                value={value.billable}
                onChange={(v) => set('billable', v as 'all' | 'billable' | 'internal')}
                options={[
                    { value: 'all', label: 'All work' },
                    { value: 'billable', label: 'Billable only' },
                    { value: 'internal', label: 'Internal only' },
                ]}
                displayLabel={BILLABLE_LABEL[value.billable]}
                highlighted={value.billable !== 'all'}
            />

            <FilterSelect
                label="Size"
                value={value.sizeBucket}
                onChange={(v) => set('sizeBucket', v as SizeBucket | 'all')}
                options={[
                    { value: 'all', label: 'All sizes' },
                    { value: 'small', label: '$0-10K' },
                    { value: 'medium', label: '$10-100K' },
                    { value: 'large', label: '$100K+' },
                ]}
                displayLabel={SIZE_LABEL[value.sizeBucket]}
                highlighted={value.sizeBucket !== 'all'}
            />

            <FilterSelect
                label="Sales rep"
                value={value.salesRep}
                onChange={(v) => set('salesRep', v)}
                options={[
                    { value: 'all', label: 'All reps' },
                    ...options.salesReps.map(r => ({ value: r, label: r })),
                ]}
                displayLabel={value.salesRep === 'all' ? 'All reps' : value.salesRep}
                highlighted={value.salesRep !== 'all'}
            />

            {isFiltered && (
                <button
                    type="button"
                    onClick={reset}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                >
                    <X className="h-3 w-3" />
                    Reset
                </button>
            )}
        </div>
    )
}

/** Compact native select styled as a pill · label prefix + arrow. */
function FilterSelect<T extends string>({ label, value, onChange, options, displayLabel, highlighted }: {
    label: string
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string }[]
    displayLabel: string
    highlighted: boolean
}) {
    return (
        <div className={`relative inline-flex items-center rounded-md border shadow-sm text-xs transition-colors ${highlighted ? 'bg-primary-soft border-primary/40 text-foreground' : 'bg-input-background/30 border-input text-foreground hover:bg-input-background/60'}`}>
            <span className="pl-2.5 py-1.5 text-muted-foreground select-none">{label}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className={`py-1.5 pr-6 font-medium ${highlighted ? 'text-foreground' : 'text-foreground'}`}>{displayLabel}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as T)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label={`Filter ${label}`}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <svg className="absolute right-2 h-3 w-3 pointer-events-none text-muted-foreground" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    )
}
