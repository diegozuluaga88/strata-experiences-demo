// TT.1 · Diego 2026-09-03 · Project selector w/ rules-based auto-hide.
// Resolves pain #5 (any-project selectable, even closed a year).
// Default hides:
//   - delivered/closed/billed > 365d ago
//   - billed + no punch list
//   - closed + no punch list
// "Include archived" toggle re-exposes the rest.
//
// Cross-company aware · shows the company badge next to each project.
//
// TT.51 · Diego 2026-09-08 · portal + auto-flip para no ser recortado por el
// overflow-hidden del DialogPanel del modal · mismo patrón que TaskTypeDropdown
// (TT.44.1). Antes: el dropdown se veía cortado cuando el modal era chico ·
// user no podía seleccionar project · Save quedaba disabled.

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Check, Archive } from 'lucide-react'
import { PROJECTS, isProjectVisibleByRules, getProject, type Project } from '../../data/projects'

interface Props {
    value: string | null
    onChange: (projectId: string) => void
}

export default function ProjectSelector({ value, onChange }: Props) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [includeArchived, setIncludeArchived] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const selected = getProject(value)

    // TT.51 · dropdown en portal fixed para no ser recortado por el
    // overflow-hidden del DialogPanel del modal · auto-flip up si abajo no cabe.
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; maxHeight: number; openUpward: boolean } | null>(null)

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return
        const compute = () => {
            const rect = btnRef.current!.getBoundingClientRect()
            const viewportH = window.innerHeight
            const spaceBelow = viewportH - rect.bottom - 16
            const spaceAbove = rect.top - 16
            const preferredH = 480
            const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow
            const maxHeight = Math.min(preferredH, openUpward ? spaceAbove : spaceBelow)
            const top = openUpward ? rect.top - 4 : rect.bottom + 4
            setMenuPos({ top, left: rect.left, width: rect.width, maxHeight, openUpward })
        }
        compute()
        window.addEventListener('resize', compute)
        window.addEventListener('scroll', compute, true)
        return () => {
            window.removeEventListener('resize', compute)
            window.removeEventListener('scroll', compute, true)
        }
    }, [open])

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            const inTrigger = ref.current?.contains(target)
            const inMenu = menuRef.current?.contains(target)
            if (!inTrigger && !inMenu) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [open])

    const visible = useMemo(() => {
        const base = includeArchived ? PROJECTS : PROJECTS.filter(p => isProjectVisibleByRules(p))
        if (!query.trim()) return base
        const q = query.toLowerCase()
        return base.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.client.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.company.toLowerCase().includes(q)
        )
    }, [query, includeArchived])

    const hiddenCount = PROJECTS.length - PROJECTS.filter(p => isProjectVisibleByRules(p)).length

    const menuContent = open && menuPos && (
        <div
            ref={menuRef}
            role="listbox"
            style={{
                position: 'fixed',
                top: menuPos.openUpward ? undefined : menuPos.top,
                bottom: menuPos.openUpward ? window.innerHeight - menuPos.top : undefined,
                left: menuPos.left,
                width: Math.max(menuPos.width, 420),
                maxHeight: menuPos.maxHeight,
            }}
            className="z-[150] overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in duration-150 flex flex-col"
        >
            {/* Search */}
            <div className="p-2 border-b border-border shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search project, client, or company…"
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-input-background/30 border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 shadow-sm transition-colors"
                        autoFocus
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-1 min-h-0">
                {visible.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No projects match “{query}”.
                    </div>
                ) : visible.map(p => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => { onChange(p.id); setOpen(false); setQuery('') }}
                        className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${value === p.id ? 'bg-primary-soft' : ''}`}
                        role="option"
                        aria-selected={value === p.id}
                    >
                        {value === p.id ? (
                            <Check className="h-3.5 w-3.5 text-success shrink-0 mt-1" />
                        ) : (
                            <span className="w-3.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                                {p.status !== 'active' && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning-soft px-1.5 py-0.5 rounded shrink-0">{p.status}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono">{p.id}</span>
                                <span>·</span>
                                <span>{p.client}</span>
                                <span>·</span>
                                <CompanyBadge company={p.company} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Include archived footer */}
            <label className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/40 cursor-pointer hover:bg-muted transition-colors shrink-0">
                <span className="flex items-center gap-2 text-xs text-foreground">
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    Include archived
                    <span className="text-muted-foreground">({hiddenCount} hidden by default)</span>
                </span>
                <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                />
            </label>
        </div>
    )

    return (
        <div ref={ref} className="relative w-full">
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border border-input bg-input-background/30 shadow-sm text-sm text-foreground hover:bg-input-background/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors ${!selected ? 'text-muted-foreground' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="truncate flex-1 text-left">
                    {selected ? (
                        <>
                            <span className="font-medium text-foreground">{selected.name}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground font-mono">{selected.id}</span>
                        </>
                    ) : 'Select project'}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {typeof document !== 'undefined' && menuContent && createPortal(menuContent, document.body)}
        </div>
    )
}

function CompanyBadge({ company }: { company: Project['company'] }) {
    // Muted per-company hue (semantic tokens only · no hex hardcoded).
    const map: Record<Project['company'], string> = {
        'Rightsize': 'text-info',
        'Office Furniture Center': 'text-ai',
        'Mac Relocations': 'text-warning',
    }
    return <span className={`text-[10px] uppercase tracking-wider font-semibold ${map[company]}`}>{company.split(' ').map(w => w[0]).join('')}</span>
}
