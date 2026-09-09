import { useEffect, useMemo, useRef, useState } from 'react'
import { Link2, Search, X, Check, Sparkles } from 'lucide-react'

export interface ReplacementCandidate {
    id: string
    vendor: string
    name: string
    type: string
    date?: string
}

interface ReplacementDocPickerProps {
    candidates: ReplacementCandidate[]
    /** Suggest docs from this vendor first (e.g. same vendor as the doc being deprecated). */
    vendorPriority?: string
    /** Exclude the doc being deprecated itself. */
    excludeId?: string
    selectedId: string | null
    onChange: (id: string | null) => void
}

export default function ReplacementDocPicker({
    candidates,
    vendorPriority,
    excludeId,
    selectedId,
    onChange,
}: ReplacementDocPickerProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    // Filter excludeId, then group by sameVendor / others, then apply search
    const { sameVendor, others } = useMemo(() => {
        const pool = candidates.filter(c => c.id !== excludeId)
        const q = query.trim().toLowerCase()
        const matchQuery = (c: ReplacementCandidate) =>
            !q || `${c.id} ${c.vendor} ${c.name}`.toLowerCase().includes(q)
        const same = vendorPriority
            ? pool.filter(c => c.vendor === vendorPriority && matchQuery(c))
            : []
        const rest = pool.filter(c => (!vendorPriority || c.vendor !== vendorPriority) && matchQuery(c))
        return { sameVendor: same, others: rest }
    }, [candidates, excludeId, vendorPriority, query])

    const selected = useMemo(
        () => candidates.find(c => c.id === selectedId) ?? null,
        [candidates, selectedId]
    )

    // Click outside to close
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // ESC to close
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open])

    const handleSelect = (id: string) => {
        onChange(id)
        setOpen(false)
        setQuery('')
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2 flex items-center justify-between">
                <span>Linked replacement document <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(optional)</span></span>
                {selected && (
                    <button
                        onClick={() => onChange(null)}
                        title="Unlink replacement"
                        className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground hover:text-foreground normal-case tracking-normal"
                    >
                        <X className="size-3" /> Unlink
                    </button>
                )}
            </div>

            {/* Trigger: chip if selected, button if not */}
            {selected ? (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    title="Click to change the linked replacement"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors text-left"
                >
                    <Link2 className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground truncate">
                            <span className="font-mono">{selected.id}</span>
                            <span className="text-muted-foreground"> · {selected.vendor}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{selected.name}</div>
                    </div>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    title="Link this archived doc to its replacement (e.g. the newer version or canonical doc)"
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-muted/40 transition-colors text-left text-[12.5px] text-muted-foreground"
                >
                    <Link2 className="size-4 shrink-0" />
                    Link a replacement document…
                </button>
            )}

            {/* Popover */}
            {open && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by ID, vendor or filename…"
                            className="flex-1 bg-transparent text-[13px] text-foreground focus:outline-none placeholder:text-muted-foreground"
                        />
                        <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            {sameVendor.length + others.length}
                        </span>
                    </div>

                    <div className="max-h-[260px] overflow-y-auto scrollbar-minimal">
                        {sameVendor.length === 0 && others.length === 0 && (
                            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                                No documents match your search.
                            </div>
                        )}

                        {sameVendor.length > 0 && (
                            <div className="py-1">
                                <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-blue-700 dark:text-blue-400">
                                    <Sparkles className="size-2.5" />
                                    Same vendor — likely matches
                                </div>
                                {sameVendor.map(c => (
                                    <CandidateRow key={c.id} candidate={c} active={c.id === selectedId} onSelect={handleSelect} />
                                ))}
                            </div>
                        )}

                        {others.length > 0 && (
                            <div className="py-1">
                                {sameVendor.length > 0 && (
                                    <div className="px-3 py-1 mt-1 border-t border-border text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                                        All other documents
                                    </div>
                                )}
                                {others.map(c => (
                                    <CandidateRow key={c.id} candidate={c} active={c.id === selectedId} onSelect={handleSelect} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end px-3 py-2 border-t border-border bg-muted/40">
                        <button
                            onClick={() => { setOpen(false); setQuery('') }}
                            className="text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

interface CandidateRowProps {
    candidate: ReplacementCandidate
    active: boolean
    onSelect: (id: string) => void
}

function CandidateRow({ candidate, active, onSelect }: CandidateRowProps) {
    return (
        <button
            onClick={() => onSelect(candidate.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                active ? 'bg-muted text-foreground' : 'hover:bg-muted/60 text-foreground/90'
            }`}
        >
            <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">
                    <span className="font-mono">{candidate.id}</span>
                    <span className="text-muted-foreground"> · {candidate.vendor}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                    {candidate.name} · {candidate.type}
                    {candidate.date && <span> · {candidate.date}</span>}
                </div>
            </div>
            {active && <Check className="size-3.5 text-foreground shrink-0" />}
        </button>
    )
}
