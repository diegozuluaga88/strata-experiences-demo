// ST-1169 · Fase 2/3 · Diego 2026-09-09 · Processing modal genérico.
//
// Modal de staged reveal reutilizable para AMBOS flows:
//   · Flow A (notif · auto-pull de Officeworks CORE) · 4 steps
//   · Flow B (drop PDFs · OCR extract) · 5 steps
//
// Escucha un CustomEvent con nombre configurable y ejecuta los steps
// (700ms cadence). Al terminar dispatcha onComplete() y el AckVsPoApp
// abre el ComparisonReviewModal REAL (mismo para ambos flows ·
// consistencia UX per Diego 2026-09-09).

import { Fragment, useEffect, useState, type ComponentType } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { X, CheckCircle2, Loader2 } from 'lucide-react'

export interface ProcessingStep {
    label: string
    detail: string
}

export interface ProcessingConfig {
    /** CustomEvent name que dispara el flujo (ej. 'ack-vs-po:pdfs-dropped'). */
    triggerEvent: string
    /** Steps a mostrar (4-5 recomendados). */
    steps: ProcessingStep[]
    /** Icon del header. */
    icon: ComponentType<{ className?: string }>
    /** Header tone · lime primary o warning amber. */
    tone: 'primary' | 'warning'
    /** Kicker uppercase. */
    kicker: string
    /** Título · deriva del CustomEvent detail (fileNames o poNumber). */
    getTitle: (detail: unknown) => string
    /** Cadence entre steps · default 700ms. */
    stepDelayMs?: number
}

interface Props {
    config: ProcessingConfig
    /** Called when the sim finishes · AckVsPoApp abre el ComparisonReviewModal. */
    onComplete: (detail: unknown) => void
}

type Phase = 'closed' | 'running' | 'done'

export default function AckVsPoProcessingModal({ config, onComplete }: Props) {
    const [phase, setPhase] = useState<Phase>('closed')
    const [detail, setDetail] = useState<unknown>(null)
    const [stepIdx, setStepIdx] = useState(0)
    const stepDelayMs = config.stepDelayMs ?? 700

    useEffect(() => {
        const onTrigger = (e: Event) => {
            setDetail((e as CustomEvent).detail)
            setStepIdx(0)
            setPhase('running')
        }
        window.addEventListener(config.triggerEvent, onTrigger)
        return () => window.removeEventListener(config.triggerEvent, onTrigger)
    }, [config.triggerEvent])

    useEffect(() => {
        if (phase !== 'running') return
        if (stepIdx >= config.steps.length) {
            const t = setTimeout(() => {
                setPhase('done')
                onComplete(detail)
                setTimeout(() => setPhase('closed'), 400)
            }, 500)
            return () => clearTimeout(t)
        }
        const t = setTimeout(() => setStepIdx(i => i + 1), stepDelayMs)
        return () => clearTimeout(t)
    }, [phase, stepIdx, detail, onComplete, config.steps.length, stepDelayMs])

    const isOpen = phase !== 'closed'
    const Icon = config.icon
    const toneClasses = config.tone === 'primary'
        ? 'bg-primary text-primary-foreground'
        : 'bg-warning/15 text-warning'

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => { /* no cancel while running */ }}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" />
                </TransitionChild>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-6 pt-24">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0"
                            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                        >
                            <DialogPanel className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${toneClasses}`}>
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{config.kicker}</div>
                                            <div className="text-sm font-semibold text-foreground truncate">{config.getTitle(detail)}</div>
                                        </div>
                                    </div>
                                    {phase === 'done' && (
                                        <button
                                            onClick={() => setPhase('closed')}
                                            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            aria-label="Close"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="p-6 space-y-3">
                                    {config.steps.map((step, i) => (
                                        <div
                                            key={step.label}
                                            className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-all ${
                                                i < stepIdx ? 'border-success/40 bg-success/5' :
                                                i === stepIdx ? 'border-primary/50 bg-primary/5' :
                                                'border-border bg-muted/20 opacity-50'
                                            }`}
                                        >
                                            {i < stepIdx ? (
                                                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                                            ) : i === stepIdx ? (
                                                <Loader2 className="h-5 w-5 text-foreground shrink-0 mt-0.5 animate-spin" />
                                            ) : (
                                                <Loader2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0 text-sm">
                                                <div className="text-foreground font-semibold">{step.label}</div>
                                                <div className="text-muted-foreground mt-0.5 text-xs">{step.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-xs text-muted-foreground text-center pt-2">
                                        {phase === 'done' ? 'Complete · opening comparison…' : 'Processing…'}
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
