// TT.46 · Diego 2026-09-08 · Shared SelectTrigger wrapper para dropdown buttons.
// Matches DS canonical input pattern + agrega ChevronDown auto.
// Ideal para custom dropdowns (ProjectSelector, TaskTypeDropdown, filter selects).

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Whether the dropdown is open (rotates chevron 180deg). */
    open?: boolean
    /** Content of the trigger (usually the selected label · Node or string). */
    children: ReactNode
    /** Optional placeholder styling when no value selected. */
    isPlaceholder?: boolean
}

const BASE = 'w-full flex items-center justify-between gap-2 rounded-lg border border-input ' +
    'bg-input-background/30 shadow-sm px-3 py-2 text-sm text-foreground ' +
    'hover:bg-input-background/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

const SelectTrigger = forwardRef<HTMLButtonElement, Props>(({ className = '', open = false, children, isPlaceholder = false, ...rest }, ref) => (
    <button
        ref={ref}
        type="button"
        className={`${BASE} ${isPlaceholder ? 'text-muted-foreground' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...rest}
    >
        <span className="truncate flex-1 text-left">{children}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
))
SelectTrigger.displayName = 'SelectTrigger'

export default SelectTrigger
