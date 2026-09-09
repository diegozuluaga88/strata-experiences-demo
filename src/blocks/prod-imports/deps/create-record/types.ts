export type RecordType = 'PO' | 'ACK'

export type FieldResolution =
    | 'resolved'
    | 'ai_suggested'
    | 'ai_uncertain'
    | 'partial'
    | 'unresolved'
    | 'unmapped'
    | 'coercion_error'

export type TargetDataType =
    | 'String'
    | 'Date'
    | 'Email'
    | 'Phone'
    | 'Number'
    | 'Currency'
    | 'Boolean'
    | 'DropDown'
    | 'Multiselect'
    | 'Object'

export type CoercionReason =
    | 'INVALID_DATE'
    | 'INVALID_EMAIL'
    | 'NOT_A_NUMBER'
    | 'VALUE_NOT_IN_LIST'
    | 'PARTIAL_LIST_MATCH'

export interface KnownValue {
    id: number
    label: string
}

export interface PreflightField {
    dtoPath: string
    displayName: string
    targetDataType: TargetDataType
    inputValue: string | number | boolean | string[] | null
    resolution: FieldResolution
    resolvedValue?: string | number | (number | null)[]
    suggestion?: number | (number | null)[]
    aiConfidence?: number
    knownValues?: KnownValue[]
    reason?: CoercionReason
    required?: boolean
    isObject?: boolean
    children?: PreflightField[]
}

export interface LineItem {
    rowIndex: number
    fields: PreflightField[]
}

export interface PreflightSection {
    id: string
    label: string
    fields: PreflightField[]
}

export interface ExtraObjectValue {
    label: string
    value: string
}

export interface ExtraField {
    id: string
    label: string
    dataType: 'String' | 'Object'
    value?: string
    objectValue?: { values: ExtraObjectValue[] }
    included: boolean
    required?: boolean
}

export interface Preflight {
    recordType: RecordType
    environment: 'qa' | 'prod'
    sections: PreflightSection[]
    lineItems: LineItem[]
    extras: ExtraField[]
}

// Per-field UI state (overrides, locked-in choices, picking mode)
export interface FieldState {
    overrideValue?: string | number | boolean | (number | null)[] | null
    locked?: boolean
    effectiveResolution?: FieldResolution
    picking?: boolean
}

export type FieldStateMap = Record<string, FieldState>

export interface FlatField extends PreflightField {
    key: string
    group: 'header' | 'line'
    sectionId?: string
    parentPath?: string
    rowIndex?: number
}

export interface PreflightSummary {
    total: number
    resolved: number
    unresolved: number
    unmapped: number
    aiSuggested: number
    aiUncertain: number
    partial: number
    coercionErrors: number
    requiredUnresolved: number
    valid: boolean
}
