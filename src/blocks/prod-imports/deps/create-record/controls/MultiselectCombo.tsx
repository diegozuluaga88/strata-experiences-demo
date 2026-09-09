import { useState } from 'react'
import { Search, X, Check } from 'lucide-react'
import type { PreflightField } from '../types'
import { labelFor } from '../usePreflight'

interface MultiselectComboProps {
    field: PreflightField
    selectedIds: number[]
    onCommit: (ids: number[]) => void
    initialOpen?: boolean
}

export default function MultiselectCombo({ field, selectedIds, onCommit, initialOpen }: MultiselectComboProps) {
    const list = field.knownValues || []
    const [draft, setDraft] = useState<number[]>(selectedIds || [])
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(!!initialOpen)

    const filtered = list.filter(kv => kv.label.toLowerCase().includes(query.toLowerCase()))
    const toggle = (id: number) => {
        setDraft(draft.includes(id) ? draft.filter(x => x !== id) : [...draft, id])
    }
    const selected = list.filter(kv => draft.includes(kv.id))

    const hasInputUnmatched = field.resolution === 'partial' && Array.isArray(field.inputValue)
    const matchedSuggestionLabels = Array.isArray(field.suggestion)
        ? (field.suggestion as (number | null)[]).filter((x): x is number => x != null).map(id => labelFor(field, id))
        : []
    const unmatchedInputs = Array.isArray(field.inputValue) && Array.isArray(field.suggestion)
        ? (field.inputValue as string[]).filter((_, i) => !(field.suggestion as (number | null)[])[i])
        : []

    return (
        <div className="space-y-2">
            {hasInputUnmatched && (matchedSuggestionLabels.length > 0 || unmatchedInputs.length > 0) && (
                <div className="text-[12px] text-muted-foreground">
                    {matchedSuggestionLabels.length > 0 && (
                        <>
                            We matched{' '}
                            <span className="text-foreground/90">{matchedSuggestionLabels.join(', ')}</span>.{' '}
                        </>
                    )}
                    {unmatchedInputs.length > 0 && (
                        <>
                            Couldn't match:{' '}
                            <span className="text-amber-700 dark:text-amber-400">"{unmatchedInputs.join('", "')}"</span>
                        </>
                    )}
                </div>
            )}

            {/* Chips display */}
            <div
                onClick={() => setOpen(true)}
                className={`min-h-[40px] w-full rounded-lg border px-2 py-1.5 text-[13px] cursor-text transition flex flex-wrap items-center gap-1.5 bg-card ${
                    open ? 'border-foreground/40 ring-2 ring-ring/20' : 'border-border hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
            >
                {selected.length === 0 && (
                    <span className="text-muted-foreground px-1">Select one or more…</span>
                )}
                {selected.map(kv => (
                    <span key={kv.id} className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[12px]">
                        {kv.label}
                        <button
                            onClick={(e) => { e.stopPropagation(); toggle(kv.id) }}
                            className="text-background/70 hover:text-background"
                            aria-label={`Remove ${kv.label}`}
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}
            </div>

            {open && (
                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Search ${list.length} options…`}
                            className="flex-1 bg-transparent text-[13px] text-foreground focus:outline-none placeholder:text-muted-foreground"
                        />
                        <span className="text-[11px] text-muted-foreground font-mono">{filtered.length}</span>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto scrollbar-minimal py-1">
                        {filtered.map(kv => {
                            const active = draft.includes(kv.id)
                            return (
                                <button
                                    key={kv.id}
                                    onClick={() => toggle(kv.id)}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] text-left transition ${
                                        active ? 'bg-muted text-foreground font-medium' : 'hover:bg-muted text-foreground/90'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`size-4 rounded border flex items-center justify-center ${
                                            active ? 'bg-foreground border-foreground' : 'border-border'
                                        }`}>
                                            {active && <Check className="size-3 text-background" />}
                                        </span>
                                        <span className="truncate">{kv.label}</span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40">
                        <span className="text-[11.5px] text-muted-foreground">{draft.length} selected</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => { setDraft(selectedIds || []); setOpen(false); setQuery('') }}
                                className="rounded-md px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onCommit(draft); setOpen(false); setQuery('') }}
                                className="rounded-md bg-foreground text-background hover:opacity-90 px-2.5 py-1 text-[12px] font-medium transition-opacity"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
