import { Sparkles, Check, X } from 'lucide-react'
import type { PreflightField } from '../types'
import { labelFor } from '../usePreflight'

interface AiSuggestionBlockProps {
    field: PreflightField
    accepted: boolean
    onAccept: () => void
    onReject: () => void
    onPickOther: () => void
}

export default function AiSuggestionBlock({ field, accepted, onAccept, onReject, onPickOther }: AiSuggestionBlockProps) {
    const suggestionId = typeof field.suggestion === 'number' ? field.suggestion : null
    const suggestionLabel = suggestionId != null ? labelFor(field, suggestionId) : '—'
    const conf = Math.round((field.aiConfidence || 0) * 100)
    const isUncertain = field.resolution === 'ai_uncertain'

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2">
                <div className={`relative flex items-center justify-center size-7 rounded-lg shrink-0 ${
                    isUncertain
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-brand-300 dark:bg-brand-500 text-zinc-900'
                }`}>
                    <Sparkles className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-muted-foreground leading-5">
                        {isUncertain ? 'Possible match' : 'Did you mean'}{' '}
                        <span className="font-medium text-foreground">{suggestionLabel}</span>{' '}
                        <span className="text-muted-foreground/60">·</span>{' '}
                        <span className={isUncertain
                            ? 'text-amber-700 dark:text-amber-400 font-medium'
                            : 'text-foreground/80 font-medium'}>{conf}% confidence</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                        From <span className="text-foreground/80">"{String(field.inputValue ?? '')}"</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {accepted ? (
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2.5 py-1.5 text-[12px] font-medium">
                        <Check className="size-3.5" /> {suggestionLabel} locked in
                        <button
                            onClick={onReject}
                            className="ml-1 text-green-700/60 hover:text-green-900 dark:text-green-400/60 dark:hover:text-green-300"
                            aria-label="Undo"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={onAccept}
                            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background hover:opacity-90 px-2.5 py-1.5 text-[12px] font-medium transition-opacity"
                        >
                            <Check className="size-3.5" /> Accept
                        </button>
                        <button
                            onClick={onPickOther}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-[12px] font-medium text-foreground/90 transition-colors"
                        >
                            Pick another
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
