import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UserPlus, Check, UserMinus } from 'lucide-react'
import { TEAM_MEMBERS, CURRENT_USER_ID, avatarGradient, getTeamMember, type TeamMember } from './teamMembers'

interface AssignPopoverProps {
    assigneeId: string | null | undefined
    onAssign: (memberId: string | null) => void
    /** Tweaks the trigger label per status. e.g. "Assign expert" / "Assign owner". */
    triggerLabel?: string
    /** Restrict the assignable list (e.g. only Expert Hub members for In-progress). Defaults to all. */
    filterRoles?: TeamMember['role'][]
    /** Compact = chip only without label text when assigned. */
    compact?: boolean
    /** Rich content shown on hover of the assigned chip (delay 250ms). Hidden when the popover is open. */
    hoverContent?: ReactNode
}

const POPOVER_WIDTH = 260
const GAP = 6 // px between trigger and floating panel

interface AnchorPos {
    top: number
    /** Distance from viewport right edge (so panel is right-aligned to trigger). */
    right: number
}

export default function AssignPopover({
    assigneeId,
    onAssign,
    triggerLabel = 'Assign',
    filterRoles,
    compact = false,
    hoverContent,
}: AssignPopoverProps) {
    const [open, setOpen] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [anchor, setAnchor] = useState<AnchorPos | null>(null)
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const triggerWrapRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const assignee = getTeamMember(assigneeId)

    const showHoverCard = hovered && !open && !!hoverContent && !!assignee
    const showUnassignedTooltip = hovered && !open && !assignee

    // Recompute trigger anchor — used by both popovers.
    const recomputeAnchor = useCallback(() => {
        const el = triggerWrapRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        setAnchor({
            top: r.bottom + GAP,
            right: Math.max(8, window.innerWidth - r.right),
        })
    }, [])

    // Compute position when popover or hover card opens; track scroll/resize.
    useEffect(() => {
        if (!open && !showHoverCard && !showUnassignedTooltip) return
        recomputeAnchor()
        window.addEventListener('scroll', recomputeAnchor, true)
        window.addEventListener('resize', recomputeAnchor)
        return () => {
            window.removeEventListener('scroll', recomputeAnchor, true)
            window.removeEventListener('resize', recomputeAnchor)
        }
    }, [open, showHoverCard, showUnassignedTooltip, recomputeAnchor])

    // Click outside closes the popover (must check both trigger AND portal popover).
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            const target = e.target as Node
            if (triggerWrapRef.current?.contains(target)) return
            if (popoverRef.current?.contains(target)) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // ESC closes the popover
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open])

    useEffect(() => () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }, [])

    const handleMouseEnter = () => {
        if (open || !hoverContent || !assignee) return
        hoverTimer.current = setTimeout(() => setHovered(true), 250)
    }
    const handleMouseLeave = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current)
            hoverTimer.current = null
        }
        setHovered(false)
    }

    const me = TEAM_MEMBERS.find(m => m.id === CURRENT_USER_ID)
    const others = TEAM_MEMBERS.filter(m => {
        if (m.id === CURRENT_USER_ID) return false
        if (filterRoles && !filterRoles.includes(m.role)) return false
        return true
    })

    const pick = (id: string | null) => {
        onAssign(id)
        setOpen(false)
    }

    const portalStyle = (anchor: AnchorPos): React.CSSProperties => ({
        position: 'fixed',
        top: anchor.top,
        right: anchor.right,
        width: POPOVER_WIDTH,
        zIndex: 250,
    })

    return (
        <div
            ref={triggerWrapRef}
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger */}
            {assignee ? (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setHovered(false); setOpen(o => !o) }}
                    title={hoverContent ? undefined : `Assigned to ${assignee.name} · ${assignee.role} · click to reassign`}
                    aria-label={`Assigned to ${assignee.name} — click to reassign`}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted px-1 py-1 transition-colors ${compact ? '' : 'pr-2.5'}`}
                >
                    <span
                        className={`size-5 rounded-full bg-gradient-to-br ${avatarGradient(assignee.id)} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}
                    >
                        {assignee.initials}
                    </span>
                    {!compact && (
                        <span className="text-[11px] font-medium text-foreground/90 truncate max-w-[80px]">
                            {assignee.id === CURRENT_USER_ID ? 'You' : assignee.name.split(' ')[0]}
                        </span>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setHovered(false); setOpen(o => !o) }}
                    aria-label={triggerLabel}
                    className="inline-flex items-center justify-center size-7 rounded-full border border-dashed border-border hover:border-foreground/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <UserPlus className="size-3.5" />
                </button>
            )}

            {/* Hover card (portal — escapes card overflow:hidden) */}
            {showHoverCard && anchor && createPortal(
                <div
                    style={portalStyle(anchor)}
                    className="rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 pointer-events-none"
                >
                    <div className="px-3 py-2.5 border-b border-border flex items-center gap-2.5">
                        <span className={`relative size-7 rounded-full bg-gradient-to-br ${avatarGradient(assignee!.id)} text-white text-[10.5px] font-bold flex items-center justify-center shrink-0`}>
                            {assignee!.initials}
                            {assignee!.online && (
                                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-2 ring-card" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-foreground truncate">
                                {assignee!.id === CURRENT_USER_ID ? `${assignee!.name} (you)` : assignee!.name}
                            </div>
                            <div className="text-[10.5px] text-muted-foreground truncate">{assignee!.role}</div>
                        </div>
                    </div>
                    <div className="px-3 py-2.5">
                        {hoverContent}
                    </div>
                </div>,
                document.body
            )}

            {/* Unassigned tooltip (portal — escapes card overflow:hidden) */}
            {showUnassignedTooltip && anchor && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        bottom: window.innerHeight - anchor.top + GAP * 2 + 28,
                        right: anchor.right,
                        zIndex: 250,
                    }}
                    className="pointer-events-none whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-100 px-2 py-1 text-[10.5px] font-medium text-white dark:text-zinc-900 shadow-md animate-in fade-in duration-100"
                >
                    {triggerLabel}
                </div>,
                document.body
            )}

            {/* Click popover (portal — escapes card overflow:hidden) */}
            {open && anchor && createPortal(
                <div
                    ref={popoverRef}
                    style={portalStyle(anchor)}
                    className="rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    <div className="px-3 py-2 border-b border-border">
                        <div className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                            {assignee ? 'Reassign document' : 'Assign document'}
                        </div>
                    </div>

                    {/* Quick: Assign to me — highlighted at top */}
                    {me && (
                        <div className="p-1.5 border-b border-border">
                            <button
                                type="button"
                                onClick={() => pick(CURRENT_USER_ID)}
                                title="Self-assign — claim this document for yourself"
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                                    assigneeId === CURRENT_USER_ID
                                        ? 'bg-brand-300/40 dark:bg-brand-500/20'
                                        : 'hover:bg-brand-300/20 dark:hover:bg-brand-500/10'
                                }`}
                            >
                                <span className={`relative size-7 rounded-full bg-gradient-to-br ${avatarGradient(me.id)} text-white text-[10.5px] font-bold flex items-center justify-center shrink-0`}>
                                    {me.initials}
                                    {me.online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-2 ring-card" />
                                    )}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] font-semibold text-foreground flex items-center gap-1.5">
                                        Assign to me
                                        <span className="text-[9.5px] font-medium tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-brand-300 dark:bg-brand-500 text-zinc-900">
                                            You
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate">{me.name} · {me.role}</div>
                                </div>
                                {assigneeId === CURRENT_USER_ID && <Check className="size-3.5 text-foreground shrink-0" />}
                            </button>
                        </div>
                    )}

                    {/* Team members */}
                    <div className="py-1 max-h-[260px] overflow-y-auto scrollbar-minimal">
                        <div className="px-3 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                            Team members
                        </div>
                        {others.map(m => {
                            const active = assigneeId === m.id
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => pick(m.id)}
                                    title={`Assign to ${m.name} · ${m.role}`}
                                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                                        active ? 'bg-muted' : 'hover:bg-muted/60'
                                    }`}
                                >
                                    <span className={`size-6 rounded-full bg-gradient-to-br ${avatarGradient(m.id)} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                                        {m.initials}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12.5px] font-medium text-foreground truncate">{m.name}</div>
                                        <div className="text-[10.5px] text-muted-foreground truncate">{m.role}</div>
                                    </div>
                                    {active && <Check className="size-3.5 text-foreground shrink-0" />}
                                </button>
                            )
                        })}
                    </div>

                    {/* Footer: Unassign */}
                    {assignee && (
                        <div className="border-t border-border p-1.5">
                            <button
                                type="button"
                                onClick={() => pick(null)}
                                title="Remove the current assignee"
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <UserMinus className="size-3.5" />
                                Unassign
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}
