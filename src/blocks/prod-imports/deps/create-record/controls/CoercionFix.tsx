import { AlertTriangle } from 'lucide-react'
import type { PreflightField, CoercionReason } from '../types'
import DatePicker from './DatePicker'

interface CoercionFixProps {
    field: PreflightField
    value: string | null | undefined
    onChange: (v: string) => void
}

const REASON_COPY: Record<CoercionReason, string> = {
    INVALID_DATE: 'Not a valid date',
    INVALID_EMAIL: 'Not a valid email',
    NOT_A_NUMBER: 'Not a number',
    VALUE_NOT_IN_LIST: 'Value not in list',
    PARTIAL_LIST_MATCH: 'Partial list match',
}

export default function CoercionFix({ field, value, onChange }: CoercionFixProps) {
    const reasonText = field.reason ? REASON_COPY[field.reason] : 'Bad format'
    const isDate = field.targetDataType === 'Date'
    const inputType = field.targetDataType === 'Email' ? 'email'
        : field.targetDataType === 'Number' || field.targetDataType === 'Currency' ? 'number'
        : 'text'

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                    <AlertTriangle className="size-4" />
                </div>
                <div className="text-[12px] text-muted-foreground leading-5">
                    {reasonText} — <span className="text-foreground">"{String(field.inputValue ?? '')}"</span>. Fix the value to continue.
                </div>
            </div>
            {isDate ? (
                <DatePicker
                    value={value ?? null}
                    onChange={onChange}
                    placeholder="Pick a date"
                />
            ) : (
                <input
                    type={inputType}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Value"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                />
            )}
        </div>
    )
}
