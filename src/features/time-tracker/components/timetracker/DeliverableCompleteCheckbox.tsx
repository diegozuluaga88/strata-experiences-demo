// TT.1 · Diego 2026-09-03 · Whitespace #1 · Deliverable complete checkbox.
// No competitor has this native · all punt to Zapier/Salesforce Milestone.
// See wurkwel-benchmark-2026-09-03.md · whitespace #1 · headline differentiator.
//
// UX pattern: 5-second undo window before the (mock) webhook fires and
// the sales rep gets the email. Borrowed from Gmail's send undo pattern.
// Toast messaging comes from coachingCopy.ts (locked tone).

import { useEffect, useRef, useState } from 'react'
import { Check, MailCheck, Undo2 } from 'lucide-react'
import { getProject } from '../../data/projects'
import { coachingCopy } from '../../data/coachingCopy'

interface Props {
    checked: boolean
    onChange: (checked: boolean) => void
    projectId: string | null
    /** Fires when the 5s undo window elapses without an Undo. */
    onDispatched?: (info: { projectId: string; salesRepName: string; salesRepEmail: string; timestampIso: string }) => void
    undoWindowSeconds?: number
}

type DispatchState =
    | { kind: 'idle' }
    | { kind: 'pending'; startedAt: number; timerId: number }
    | { kind: 'dispatched'; at: string }

export default function DeliverableCompleteCheckbox({ checked, onChange, projectId, onDispatched, undoWindowSeconds = 5 }: Props) {
    const [dispatch, setDispatch] = useState<DispatchState>({ kind: 'idle' })
    const [remaining, setRemaining] = useState(undoWindowSeconds)
    const tickRef = useRef<number | null>(null)
    const project = getProject(projectId)

    // Clear timers on unmount to avoid orphan dispatches.
    useEffect(() => {
        return () => {
            if (dispatch.kind === 'pending') window.clearTimeout(dispatch.timerId)
            if (tickRef.current !== null) window.clearInterval(tickRef.current)
        }
    }, [dispatch])

    // Reset if project changes or checkbox unchecked.
    useEffect(() => {
        if (!checked && dispatch.kind !== 'idle') cancelPending()
    }, [checked]) // eslint-disable-line react-hooks/exhaustive-deps

    const cancelPending = () => {
        if (dispatch.kind === 'pending') window.clearTimeout(dispatch.timerId)
        if (tickRef.current !== null) window.clearInterval(tickRef.current)
        tickRef.current = null
        setDispatch({ kind: 'idle' })
        setRemaining(undoWindowSeconds)
    }

    const handleToggle = (next: boolean) => {
        onChange(next)
        if (!next) {
            cancelPending()
            return
        }
        if (!project) return
        // Start 5s undo timer
        setRemaining(undoWindowSeconds)
        const startedAt = Date.now()
        const timerId = window.setTimeout(() => {
            const nowIso = new Date().toISOString()
            setDispatch({ kind: 'dispatched', at: nowIso })
            onDispatched?.({
                projectId: project.id,
                salesRepName: project.salesRepName,
                salesRepEmail: project.salesRepEmail,
                timestampIso: nowIso,
            })
            if (tickRef.current !== null) window.clearInterval(tickRef.current)
            tickRef.current = null
        }, undoWindowSeconds * 1000)
        // Countdown tick
        tickRef.current = window.setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000)
            setRemaining(Math.max(0, undoWindowSeconds - elapsed))
        }, 250)
        setDispatch({ kind: 'pending', startedAt, timerId })
    }

    // TT.20 · disabled visual + hint · el checkbox depende de tener project
    // (sin project no hay salesRep al que mandar el email). Antes no daba
    // feedback visual y parecía que "no cambiaba de estado" al click.
    // TT.22 · Diego 2026-09-03 · después del dispatch el UI queda pegado
    // en 'checked' (no se puede uncheck) · antes un click accidental lo
    // desmarcaba visualmente aunque el email ya se envió. Además checkbox
    // más grande (h-6 w-6) y checkmark stroke 3.5 para que se vea claro.
    // TT.24 · Diego 2026-09-03 · fix definitivo · el visual "marcado" ahora
    // depende de un state interno `everChecked` que sticky-persiste una vez
    // que el user clickeó (evita que un re-render externo lo desmarque
    // visualmente). El input hidden también refleja este visual state.
    const isDisabled = !project
    const isPending = dispatch.kind === 'pending'
    const isLocked = dispatch.kind === 'dispatched'
    const [everChecked, setEverChecked] = useState(checked)
    useEffect(() => {
        if (checked) setEverChecked(true)
        // Reset visual solo cuando el user explicit uncheck Y el dispatch está idle.
        else if (dispatch.kind === 'idle') setEverChecked(false)
    }, [checked, dispatch.kind])
    const showChecked = everChecked || isLocked

    // TT.28 · usar tailwind default colors (green-600/emerald/amber) para
    // no depender del custom config. Antes bg-success/border-success no se
    // emitían cuando el config no tenía la key registrada · checkbox invisible.
    return (
        <div className={`rounded-lg border p-3 space-y-2 transition-colors ${
            isDisabled ? 'border-dashed border-zinc-300 bg-zinc-100/60 dark:bg-zinc-800/40' :
            isLocked ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' :
            isPending ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' :
            showChecked ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20' :
            'border-border bg-card'
        }`}>
            <label className={`flex items-start gap-3 group ${isDisabled ? 'cursor-not-allowed' : isLocked ? 'cursor-default' : 'cursor-pointer'}`}>
                <div className={`h-7 w-7 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isDisabled ? 'border-zinc-300 bg-zinc-100 opacity-60' :
                    showChecked ? 'bg-emerald-600 border-emerald-700 shadow-md' :
                    'border-zinc-400 bg-white dark:bg-zinc-900 group-hover:border-emerald-500'
                }`}>
                    {showChecked && !isDisabled && <Check className="h-5 w-5 text-white" strokeWidth={4} />}
                </div>
                <div className="flex-1">
                    <div className={`text-sm font-semibold ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        Mark deliverable complete
                        {isLocked && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">· Sent</span>}
                        {isPending && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">· Sending</span>}
                    </div>
                    <p className={`text-xs mt-0.5 ${isDisabled ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {project
                            ? <>Fires an email to <span className="font-medium text-foreground">{project.salesRepName}</span> on <span className="font-medium text-foreground">{project.name}</span>.</>
                            : 'Select a project above to enable this action.'}
                    </p>
                </div>
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={showChecked}
                    disabled={isDisabled || isLocked}
                    onChange={(e) => handleToggle(e.target.checked)}
                />
            </label>

            {dispatch.kind === 'pending' && project && (
                <div className="flex items-center justify-between gap-3 rounded-md bg-warning-soft border border-warning/30 px-3 py-2">
                    <span className="text-xs text-foreground">
                        {coachingCopy.deliverableMarkedComplete({
                            salesRepName: project.salesRepName,
                            projectName: project.name,
                            undoWindowSeconds: remaining,
                        })}
                    </span>
                    <button
                        type="button"
                        onClick={cancelPending}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-warning hover:text-foreground transition-colors"
                    >
                        <Undo2 className="h-3.5 w-3.5" />
                        Undo
                    </button>
                </div>
            )}

            {dispatch.kind === 'dispatched' && project && (
                <div className="flex items-center gap-2 rounded-md bg-success-soft border border-success/30 px-3 py-2 text-xs text-foreground">
                    <MailCheck className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>
                        {coachingCopy.deliverableSent({
                            salesRepName: project.salesRepName,
                            projectName: project.name,
                            undoWindowSeconds: 0,
                        })}
                    </span>
                </div>
            )}
        </div>
    )
}
