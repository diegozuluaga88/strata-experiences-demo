import type { FieldResolution } from '../types'
import { TONE } from './tone'

interface ResolutionPillProps {
    resolution: FieldResolution
}

const HINTS: Record<FieldResolution, string> = {
    resolved: 'Field is ready — value will be stored on the record',
    ai_suggested: 'AI proposed a value with high confidence — accept to lock in',
    ai_uncertain: 'AI proposed a value with low confidence — please verify',
    partial: 'Some entries matched the catalog, others did not — review selection',
    unresolved: 'Value not in the allowed list — pick a valid option',
    unmapped: 'Field not part of the Orderbahn schema — will be dropped',
    coercion_error: 'Value has invalid format — correct it to continue',
}

export default function ResolutionPill({ resolution }: ResolutionPillProps) {
    const t = TONE[resolution]
    return (
        <span title={HINTS[resolution]} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${t.pill}`}>
            <span className={`inline-block size-1.5 rounded-full ${t.dot}`} />
            {t.label}
        </span>
    )
}
