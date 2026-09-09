import { Check, ArrowRight, Sparkles } from 'lucide-react'
import type { RecordType } from '../types'
import { configFor } from '../recordTypeConfig'

export interface PublishResult {
    recordId: string
    fieldsSaved: number
    fieldsDropped: number
    lineCount: number
    environment: 'qa' | 'prod'
}

interface PublishedViewProps {
    result: PublishResult
    recordType: RecordType
    vendor: string
    onClose: () => void
    onViewRecord: () => void
}

interface StatCardProps {
    eyebrow: string
    value: React.ReactNode
    subtext?: React.ReactNode
    valueClassName?: string
}

function StatCard({ eyebrow, value, subtext, valueClassName }: StatCardProps) {
    return (
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
            <div className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                {eyebrow}
            </div>
            <div className={`mt-2 text-[22px] font-semibold tracking-tight text-foreground ${valueClassName ?? ''}`}>
                {value}
            </div>
            {subtext && (
                <div className="mt-1 text-[11.5px] text-muted-foreground">
                    {subtext}
                </div>
            )}
        </div>
    )
}

function formatTimestamp(d: Date): string {
    const opts: Intl.DateTimeFormatOptions = {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }
    return d.toLocaleString('en-US', opts)
}

export default function PublishedView({ result, recordType, vendor, onClose, onViewRecord }: PublishedViewProps) {
    const cfg = configFor(recordType)
    const recordTypeLabel = cfg.label
    const createdAt = formatTimestamp(new Date())

    return (
        <div className="relative h-full w-full flex flex-col items-center justify-center px-12 py-10 animate-in fade-in duration-300 overflow-hidden">
            {/* Subtle radial halo behind hero */}
            <div
                aria-hidden="true"
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[480px] rounded-full opacity-30 dark:opacity-20 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgb(from var(--color-brand-300) r g b / 0.35) 0%, transparent 65%)',
                }}
            />

            {/* Hero */}
            <div className="relative flex flex-col items-center">
                <div className="relative">
                    <div className="relative mx-auto size-20 rounded-full bg-brand-300 dark:bg-brand-500 flex items-center justify-center shadow-[0_12px_48px_-8px_rgba(198,228,51,0.55)]">
                        <Check className="size-10 text-zinc-900" strokeWidth={2.5} />
                    </div>
                    {/* Outer halo ring */}
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 -m-3 rounded-full ring-1 ring-brand-300/40 dark:ring-brand-500/30"
                    />
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 -m-6 rounded-full ring-1 ring-brand-300/15 dark:ring-brand-500/10"
                    />
                </div>

                <div className="mt-6 flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                        Created
                    </span>
                    <span className="size-1 rounded-full bg-muted-foreground/40" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground/80 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider">
                        {result.environment} environment
                    </span>
                </div>

                <h2 className="mt-2 text-[32px] font-medium tracking-tight text-foreground font-brand">
                    {cfg.successHeroCopy}
                </h2>
                <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed text-center max-w-md">
                    Record stored in Orderbahn. Line items persisted and synced to downstream systems.
                </p>
            </div>

            {/* Stats row */}
            <div className="relative mt-10 w-full max-w-3xl grid grid-cols-4 gap-3">
                <StatCard
                    eyebrow="Record ID"
                    value={<span className="font-mono">#{result.recordId}</span>}
                    valueClassName="text-[18px]"
                    subtext={<span className="inline-flex items-center gap-1"><Sparkles className="size-3" /> Just now</span>}
                />
                <StatCard
                    eyebrow="Vendor"
                    value={<span>{vendor}</span>}
                    valueClassName="text-[18px] truncate"
                    subtext={recordTypeLabel}
                />
                <StatCard
                    eyebrow="Fields saved"
                    value={<span className="text-green-700 dark:text-green-400">{result.fieldsSaved}</span>}
                    subtext={
                        result.fieldsDropped > 0
                            ? <>{result.fieldsDropped} dropped (not sent)</>
                            : <>All fields persisted</>
                    }
                />
                <StatCard
                    eyebrow="Line items"
                    value={<span>{result.lineCount}</span>}
                    subtext={result.lineCount === 1 ? 'row persisted' : 'rows persisted'}
                />
            </div>

            {/* Timestamp */}
            <div className="relative mt-6 text-[12px] text-muted-foreground">
                {createdAt}
            </div>

            {/* Actions */}
            <div className="relative mt-8 flex items-center gap-3">
                <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors"
                >
                    Close
                </button>
                <button
                    onClick={onViewRecord}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background hover:opacity-90 px-6 py-2.5 text-[13px] font-semibold transition-opacity"
                >
                    View record <ArrowRight className="size-3.5" />
                </button>
            </div>
        </div>
    )
}
