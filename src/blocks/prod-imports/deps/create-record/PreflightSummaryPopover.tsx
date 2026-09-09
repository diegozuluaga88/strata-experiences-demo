import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import type { PreflightSummary } from './types'
import ProgressRing from './left-rail/ProgressRing'
import SegmentedBar from './left-rail/SegmentedBar'
import StatusLegend from './left-rail/StatusLegend'

interface PreflightSummaryPopoverProps {
    summary: PreflightSummary
}

const PANEL_WIDTH = 320
const GAP = 8

interface AnchorPos {
    top: number
    right: number
}

export default function PreflightSummaryPopover({ summary }: PreflightSummaryPopoverProps) {
    const [open, setOpen] = useState(false)
    const [anchor, setAnchor] = useState<AnchorPos | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    const pct = Math.round((summary.resolved / (summary.total || 1)) * 100)

    const recompute = useCallback(() => {
        const el = triggerRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        setAnchor({
            top: r.bottom + GAP,
            right: Math.max(8, window.innerWidth - r.right),
        })
    }, [])

    useEffect(() => {
        if (!open) return
        recompute()
        window.addEventListener('scroll', recompute, true)
        window.addEventListener('resize', recompute)
        return () => {
            window.removeEventListener('scroll', recompute, true)
            window.removeEventListener('resize', recompute)
        }
    }, [open, recompute])

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t)) return
            if (panelRef.current?.contains(t)) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open])

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                title="Show full preflight breakdown — fields ready, partial, missing, etc."
                aria-label={`Preflight ${pct}% ready — click for breakdown`}
                className={`inline-flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted px-2.5 py-1 transition-colors ${
                    open ? 'bg-muted' : ''
                }`}
            >
                <span className="relative size-5">
                    <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
                        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-muted/60" />
                        <circle
                            cx="10" cy="10" r="8"
                            stroke="currentColor" strokeWidth="2.5" fill="none"
                            strokeDasharray={2 * Math.PI * 8}
                            strokeDashoffset={(2 * Math.PI * 8) - (pct / 100) * (2 * Math.PI * 8)}
                            strokeLinecap="round"
                            className="text-foreground transition-[stroke-dashoffset] duration-500"
                        />
                    </svg>
                </span>
                <span className="text-[11.5px] font-semibold text-foreground tabular-nums">{pct}%</span>
                <span className="text-[11px] font-medium text-muted-foreground">ready</span>
                <ChevronDown className={`size-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && anchor && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: anchor.top,
                        right: anchor.right,
                        width: PANEL_WIDTH,
                        zIndex: 250,
                    }}
                    className="rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                        <ProgressRing pct={pct} />
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold text-foreground">Preflight</div>
                            <div className="text-[11.5px] text-muted-foreground mt-0.5">
                                {summary.resolved} of {summary.total} fields ready
                            </div>
                            <div className="mt-2">
                                <SegmentedBar summary={summary} />
                            </div>
                        </div>
                    </div>
                    <div className="px-4 py-3">
                        <div className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
                            Breakdown
                        </div>
                        <StatusLegend summary={summary} />
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
