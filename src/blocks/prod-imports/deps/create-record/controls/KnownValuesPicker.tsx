import { useState } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import type { PreflightField } from '../types'
import { labelFor } from '../usePreflight'

interface KnownValuesPickerProps {
    field: PreflightField
    selectedId?: number | string | boolean | null
    onPick: (id: number) => void
    placeholder?: string
}

export default function KnownValuesPicker({ field, selectedId, onPick, placeholder }: KnownValuesPickerProps) {
    const list = field.knownValues || []
    const useCombo = list.length > 8
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)

    if (!useCombo) {
        return (
            <div className="space-y-2">
                {field.inputValue != null && selectedId == null && (
                    <div className="text-[12px] text-muted-foreground">
                        <span className="text-foreground/80">"{String(field.inputValue)}"</span> isn't a valid option. Pick one:
                    </div>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                    {list.map(kv => {
                        const active = selectedId === kv.id
                        return (
                            <button
                                key={kv.id}
                                onClick={() => onPick(kv.id)}
                                className={`text-left rounded-md border px-2.5 py-1.5 text-[12.5px] transition ${
                                    active
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-muted text-foreground/90'
                                }`}
                            >
                                <span className="truncate font-medium block">{kv.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    const selectedLabel = selectedId != null ? labelFor(field, Number(selectedId)) : null
    const filtered = list.filter(kv => kv.label.toLowerCase().includes(query.toLowerCase()))

    return (
        <div className="space-y-2">
            {field.inputValue != null && selectedId == null && (
                <div className="text-[12px] text-muted-foreground">
                    <span className="text-foreground/80">"{String(field.inputValue)}"</span> isn't a valid option.
                </div>
            )}
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px] text-left transition ${
                        selectedLabel
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-600 text-foreground'
                    }`}
                >
                    <span className="truncate">
                        {selectedLabel || placeholder || 'Choose from list…'}
                    </span>
                    <ChevronDown className={`size-3.5 shrink-0 transition ${open ? 'rotate-180' : ''} ${selectedLabel ? 'text-background/70' : 'text-muted-foreground'}`} />
                </button>
                {open && (
                    <div className="absolute z-20 mt-1.5 w-full rounded-lg border border-border bg-card shadow-xl overflow-hidden">
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
                        <div className="max-h-[220px] overflow-y-auto scrollbar-minimal py-1">
                            {filtered.length === 0 && (
                                <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">No matches</div>
                            )}
                            {filtered.map(kv => {
                                const active = selectedId === kv.id
                                return (
                                    <button
                                        key={kv.id}
                                        onClick={() => { onPick(kv.id); setOpen(false); setQuery('') }}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] text-left transition ${
                                            active
                                                ? 'bg-muted text-foreground font-medium'
                                                : 'hover:bg-muted text-foreground/90'
                                        }`}
                                    >
                                        <span className="truncate">{kv.label}</span>
                                        {active && <Check className="size-3.5 text-foreground" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
