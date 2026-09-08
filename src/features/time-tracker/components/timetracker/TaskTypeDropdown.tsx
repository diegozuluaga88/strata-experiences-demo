// TT.1 · Diego 2026-09-03 · Task Type dropdown.
// Two-field pattern (dropdown + memo) resolves pain #4 (free-text drift).
// Admin-owned taxonomy grouped by kind · completion state suffix when
// the task type supports it (block-plan · v1 → block-plan · complete).
// Prompt-before-submit lives at the form level (TimeEntryForm), not here.

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import {
    TASK_TYPES,
    GROUP_ORDER,
    GROUP_LABEL,
    COMPLETION_STATES,
    formatTaskLabel,
    getTaskType,
    type TaskType,
    type CompletionState,
} from '../../data/taskTypes'

interface Props {
    value: string | null
    completionState?: CompletionState
    onChange: (taskTypeId: string, completionState?: CompletionState) => void
    /** Visual size · form field vs compact chip. */
    size?: 'default' | 'compact'
}

export default function TaskTypeDropdown({ value, completionState, onChange, size = 'default' }: Props) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const selected = getTaskType(value)

    // TT.44.1 · Diego 2026-09-08 · dropdown en portal fixed para no ser
    // recortado por el overflow-hidden del DialogPanel del modal.
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; maxHeight: number; openUpward: boolean } | null>(null)

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return
        const compute = () => {
            const rect = btnRef.current!.getBoundingClientRect()
            const viewportH = window.innerHeight
            const spaceBelow = viewportH - rect.bottom - 16
            const spaceAbove = rect.top - 16
            const preferredH = 360
            const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow
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

    const btnBase = 'flex items-center justify-between gap-2 rounded-lg border border-input bg-input-background/30 shadow-sm text-sm text-foreground hover:bg-input-background/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors'
    const btnSize = size === 'compact' ? 'px-3 py-1.5' : 'px-3 py-2 w-full'
    const labelText = selected
        ? formatTaskLabel(selected, completionState)
        : 'Select task type'

    const menuContent = open && menuPos && (
        <div
            ref={menuRef}
            role="listbox"
            style={{
                position: 'fixed',
                top: menuPos.openUpward ? undefined : menuPos.top,
                bottom: menuPos.openUpward ? window.innerHeight - menuPos.top : undefined,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
            }}
            className="z-[150] min-w-[280px] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg animate-in fade-in duration-150"
        >
            {GROUP_ORDER.map(group => {
                const items = TASK_TYPES.filter(t => t.group === group)
                if (items.length === 0) return null
                return (
                    <div key={group} className="py-1">
                        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {GROUP_LABEL[group]}
                        </div>
                        {items.map(item => (
                            <div key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(item.id, item.supportsCompletionState ? completionState ?? 'v1' : undefined)
                                        if (!item.supportsCompletionState) setOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors ${value === item.id ? 'text-foreground font-medium' : 'text-foreground'}`}
                                    role="option"
                                    aria-selected={value === item.id}
                                >
                                    {value === item.id ? (
                                        <Check className="h-3.5 w-3.5 text-success shrink-0" />
                                    ) : (
                                        <span className="w-3.5 shrink-0" />
                                    )}
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {!item.defaultBillable && (
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Internal</span>
                                    )}
                                </button>
                                {value === item.id && item.supportsCompletionState && (
                                    <CompletionStatePicker
                                        current={completionState ?? 'v1'}
                                        onPick={(cs) => { onChange(item.id, cs); setOpen(false) }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    )

    return (
        <div ref={ref} className={`relative ${size === 'default' ? 'w-full' : ''}`}>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`${btnBase} ${btnSize} ${!selected ? 'text-muted-foreground' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="truncate">{labelText}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {typeof document !== 'undefined' && menuContent && createPortal(menuContent, document.body)}
        </div>
    )
}

function CompletionStatePicker({ current, onPick }: { current: CompletionState; onPick: (cs: CompletionState) => void }) {
    return (
        <div className="pl-9 pr-3 pb-2 pt-1 flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">State</span>
            {COMPLETION_STATES.map(cs => (
                <button
                    key={cs}
                    type="button"
                    onClick={() => onPick(cs)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors ${current === cs ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:bg-accent'}`}
                >
                    {cs}
                </button>
            ))}
        </div>
    )
}

export type { TaskType, CompletionState }
