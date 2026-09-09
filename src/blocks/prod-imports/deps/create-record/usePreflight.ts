import { useCallback, useMemo, useState } from 'react'
import type {
    Preflight,
    FieldStateMap,
    FieldState,
    FlatField,
    PreflightSummary,
    PreflightField,
} from './types'

// Walk sections + line items and return one flat list of fields.
// Object fields (with children) get flattened to their leaves.
export function flattenAll(preflight: Preflight): FlatField[] {
    const out: FlatField[] = []
    preflight.sections.forEach(section => {
        section.fields.forEach(f => {
            if (f.isObject && f.children) {
                f.children.forEach(c => {
                    out.push({
                        ...c,
                        key: `h:${section.id}:${f.dtoPath}:${c.dtoPath}`,
                        group: 'header',
                        sectionId: section.id,
                        parentPath: f.dtoPath,
                    })
                })
            } else {
                out.push({
                    ...f,
                    key: `h:${section.id}:${f.dtoPath}`,
                    group: 'header',
                    sectionId: section.id,
                })
            }
        })
    })
    preflight.lineItems.forEach(li => {
        li.fields.forEach(f => {
            out.push({
                ...f,
                key: `li${li.rowIndex}:${f.dtoPath}`,
                group: 'line',
                rowIndex: li.rowIndex,
            })
        })
    })
    return out
}

export function reduceSummary(flat: FlatField[], fieldState: FieldStateMap): PreflightSummary {
    const counts = {
        total: flat.length,
        resolved: 0,
        unresolved: 0,
        unmapped: 0,
        aiSuggested: 0,
        aiUncertain: 0,
        partial: 0,
        coercionErrors: 0,
        requiredUnresolved: 0,
    }
    for (const f of flat) {
        const st = fieldState[f.key]
        const r = (st && st.effectiveResolution) || f.resolution
        if (r === 'resolved' || r === 'ai_suggested') counts.resolved += 1
        if (r === 'unresolved') {
            counts.unresolved += 1
            if (f.required) counts.requiredUnresolved += 1
        }
        if (r === 'unmapped') counts.unmapped += 1
        if (r === 'ai_suggested') counts.aiSuggested += 1
        if (r === 'ai_uncertain') {
            counts.aiUncertain += 1
            if (f.required) counts.requiredUnresolved += 1
        }
        if (r === 'partial') {
            counts.partial += 1
            if (f.required) counts.requiredUnresolved += 1
        }
        if (r === 'coercion_error') {
            counts.coercionErrors += 1
            if (f.required) counts.requiredUnresolved += 1
        }
    }
    const valid =
        counts.unresolved === 0 &&
        counts.coercionErrors === 0 &&
        counts.aiUncertain === 0 &&
        counts.partial === 0 &&
        counts.requiredUnresolved === 0
    return { ...counts, valid }
}

// Quick "would this preflight require user intervention?" check.
// Useful for routing decisions before actually opening the modal.
export function preflightHasInconsistencies(preflight: Preflight): boolean {
    const flat = flattenAll(preflight)
    const summary = reduceSummary(flat, {})
    return !summary.valid
}

export interface UsePreflightResult {
    flat: FlatField[]
    summary: PreflightSummary
    headerCounts: { total: number; resolved: number; issues: number }
    lineCounts: { total: number; resolved: number; rows: number; issues: number }
    fieldState: FieldStateMap
    setFS: (key: string) => (patch: FieldState) => void
    overrideCount: number
    resetState: () => void
}

export function usePreflight(preflight: Preflight): UsePreflightResult {
    const [fieldState, setFieldState] = useState<FieldStateMap>({})

    const flat = useMemo(() => flattenAll(preflight), [preflight])
    const summary = useMemo(() => reduceSummary(flat, fieldState), [flat, fieldState])

    const headerCounts = useMemo(() => {
        const hf = flat.filter(f => f.group === 'header')
        const s = reduceSummary(hf, fieldState)
        return {
            total: s.total,
            resolved: s.resolved,
            issues: s.unresolved + s.coercionErrors + s.aiUncertain + s.partial,
        }
    }, [flat, fieldState])

    const lineCounts = useMemo(() => {
        const lf = flat.filter(f => f.group === 'line')
        const s = reduceSummary(lf, fieldState)
        return {
            total: s.total,
            resolved: s.resolved,
            rows: preflight.lineItems.length,
            issues: s.unresolved + s.coercionErrors + s.aiUncertain + s.partial,
        }
    }, [flat, fieldState, preflight.lineItems.length])

    const setFS = useCallback(
        (key: string) => (patch: FieldState) =>
            setFieldState(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } })),
        []
    )

    const overrideCount = useMemo(() => {
        let n = 0
        Object.values(fieldState).forEach(v => {
            if (v && v.overrideValue != null) n += 1
        })
        return n
    }, [fieldState])

    const resetState = useCallback(() => setFieldState({}), [])

    return {
        flat,
        summary,
        headerCounts,
        lineCounts,
        fieldState,
        setFS,
        overrideCount,
        resetState,
    }
}

// Helpers for FieldRow consumers
export function labelFor(field: PreflightField, id: number): string {
    const kv = (field.knownValues || []).find(x => x.id === id)
    return kv ? kv.label : String(id)
}

export function formatFieldDisplay(
    value: PreflightField['resolvedValue'] | string | number | boolean | null,
    type: PreflightField['targetDataType'],
    knownValues?: PreflightField['knownValues']
): string {
    if (value == null) return '—'
    if (type === 'Currency') {
        const num = Number(value)
        if (Number.isNaN(num)) return String(value)
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if (type === 'Boolean') return value === true || value === 'true' ? 'Yes' : 'No'
    if (type === 'DropDown' && knownValues) {
        const kv = knownValues.find(x => x.id === value)
        if (kv) return kv.label
    }
    if (type === 'Multiselect' && Array.isArray(value) && knownValues) {
        return value
            .map(id => {
                const kv = knownValues.find(x => x.id === id)
                return kv ? kv.label : String(id)
            })
            .join(', ')
    }
    return String(value)
}
