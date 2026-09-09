import { Check } from 'lucide-react'
import type { PreflightField, FieldState, FieldResolution } from '../types'
import { formatFieldDisplay, labelFor } from '../usePreflight'
import AiSuggestionBlock from '../controls/AiSuggestionBlock'
import KnownValuesPicker from '../controls/KnownValuesPicker'
import MultiselectCombo from '../controls/MultiselectCombo'
import CoercionFix from '../controls/CoercionFix'
import BooleanEditable from '../controls/BooleanEditable'
import UnmappedNotice from '../controls/UnmappedNotice'

interface FieldBodyProps {
    field: PreflightField
    state?: FieldState
    setState: (patch: FieldState) => void
    effective: FieldResolution
}

function ResolvedValueDisplay({ field, state }: { field: PreflightField; state?: FieldState }) {
    if (field.targetDataType === 'Boolean') {
        return <BooleanEditable field={field} state={state} setState={() => {}} />
    }
    const raw = state?.overrideValue != null ? state.overrideValue : field.resolvedValue
    const display = formatFieldDisplay(raw as string | number | boolean | null, field.targetDataType, field.knownValues)
    return <div className="text-[13.5px] text-foreground truncate">{display}</div>
}

function OverrideSummary({ field, value }: { field: PreflightField; value: FieldState['overrideValue'] }) {
    if (Array.isArray(value)) {
        return <>{value.map(id => labelFor(field, Number(id))).join(', ')}</>
    }
    if (typeof value === 'number') {
        return <>{labelFor(field, value)}</>
    }
    return <>{String(value)}</>
}

export default function FieldBody({ field, state, setState, effective }: FieldBodyProps) {
    // Override active → show committed value with Reset
    if (state?.overrideValue != null && effective === 'resolved' && field.resolution !== 'resolved') {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md bg-green-50/60 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-2.5 py-1.5">
                <div className="text-[12.5px] text-green-900 dark:text-green-300 truncate">
                    <Check className="size-3 inline mr-1 -mt-0.5" />
                    <OverrideSummary field={field} value={state.overrideValue} />
                </div>
                <button
                    onClick={() => setState({
                        overrideValue: null,
                        locked: false,
                        effectiveResolution: field.resolution,
                        picking: false,
                    })}
                    title="Discard your change and restore the original AI-extracted value"
                    className="text-green-700/70 hover:text-green-900 dark:text-green-400/80 dark:hover:text-green-300 text-[12px] font-medium shrink-0"
                >
                    Reset
                </button>
            </div>
        )
    }

    switch (field.resolution) {
        case 'resolved':
            if (field.targetDataType === 'Boolean') {
                return <BooleanEditable field={field} state={state} setState={setState} />
            }
            return <ResolvedValueDisplay field={field} state={state} />

        case 'ai_suggested':
        case 'ai_uncertain': {
            const accepted = state?.overrideValue === field.suggestion
            if (state?.picking) {
                return (
                    <KnownValuesPicker
                        field={field}
                        selectedId={state?.overrideValue as number | null | undefined}
                        onPick={(id) => setState({
                            overrideValue: id,
                            locked: true,
                            effectiveResolution: 'resolved',
                            picking: false,
                        })}
                    />
                )
            }
            return (
                <AiSuggestionBlock
                    field={field}
                    accepted={accepted}
                    onAccept={() => setState({
                        overrideValue: field.suggestion as number,
                        locked: true,
                        effectiveResolution: 'resolved',
                    })}
                    onReject={() => setState({
                        overrideValue: null,
                        locked: false,
                        effectiveResolution: field.resolution,
                    })}
                    onPickOther={() => setState({ picking: true })}
                />
            )
        }

        case 'unresolved':
            return (
                <KnownValuesPicker
                    field={field}
                    selectedId={state?.overrideValue as number | null | undefined}
                    onPick={(id) => setState({
                        overrideValue: id,
                        locked: true,
                        effectiveResolution: 'resolved',
                    })}
                />
            )

        case 'partial': {
            const initial = Array.isArray(field.suggestion)
                ? (field.suggestion as (number | null)[]).filter((x): x is number => x != null)
                : []
            const current = Array.isArray(state?.overrideValue)
                ? (state.overrideValue as number[])
                : initial
            return (
                <MultiselectCombo
                    field={field}
                    selectedIds={current}
                    onCommit={(ids) => setState({
                        overrideValue: ids,
                        locked: ids.length > 0,
                        effectiveResolution: ids.length > 0 ? 'resolved' : 'partial',
                    })}
                />
            )
        }

        case 'coercion_error':
            return (
                <CoercionFix
                    field={field}
                    value={state?.overrideValue as string | null | undefined}
                    onChange={(v) => {
                        const isValid = field.targetDataType === 'Date'
                            ? !Number.isNaN(Date.parse(v))
                            : (field.targetDataType === 'Currency' || field.targetDataType === 'Number')
                                ? !Number.isNaN(parseFloat(v))
                                : field.targetDataType === 'Email'
                                    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
                                    : v.length > 0
                        setState({
                            overrideValue: v,
                            locked: isValid,
                            effectiveResolution: isValid ? 'resolved' : 'coercion_error',
                        })
                    }}
                />
            )

        case 'unmapped':
            return <UnmappedNotice field={field} />

        default:
            return null
    }
}
