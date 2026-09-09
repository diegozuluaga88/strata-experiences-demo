import { DollarSign, Store, Calendar } from 'lucide-react'
import type {
    Preflight,
    FieldStateMap,
    PreflightField,
    RecordType,
} from './types'
import { configFor } from './recordTypeConfig'
import { formatFieldDisplay, labelFor } from './usePreflight'

interface KpiCalloutProps {
    preflight: Preflight
    recordType: RecordType
    fieldState: FieldStateMap
}

function findFieldByPath(preflight: Preflight, path: string): { field: PreflightField; key: string } | null {
    for (const section of preflight.sections) {
        for (const f of section.fields) {
            if (f.dtoPath === path) return { field: f, key: `h:${section.id}:${f.dtoPath}` }
            if (f.isObject && f.children) {
                for (const c of f.children) {
                    if (c.dtoPath === path) return { field: c, key: `h:${section.id}:${f.dtoPath}:${c.dtoPath}` }
                }
            }
        }
    }
    return null
}

function effectiveValue(field: PreflightField, key: string, fieldState: FieldStateMap): string {
    const st = fieldState[key]
    const raw = st?.overrideValue != null ? st.overrideValue : (field.resolvedValue ?? field.inputValue)
    // Special handling for dropdowns that resolve to an id
    if (field.targetDataType === 'DropDown' && field.knownValues && typeof raw === 'number') {
        return labelFor(field, raw)
    }
    return formatFieldDisplay(raw as string | number | boolean | null, field.targetDataType, field.knownValues)
}

interface KpiCellProps {
    icon: React.ReactNode
    eyebrow: string
    value: string
    hint: string
}

function KpiCell({ icon, eyebrow, value, hint }: KpiCellProps) {
    return (
        <div title={hint} className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-7 rounded-md bg-muted text-muted-foreground shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[9.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                    {eyebrow}
                </div>
                <div className="text-[13px] font-medium text-foreground truncate">
                    {value}
                </div>
            </div>
        </div>
    )
}

export default function KpiCallout({ preflight, recordType, fieldState }: KpiCalloutProps) {
    const cfg = configFor(recordType)

    const totalInfo = findFieldByPath(preflight, cfg.kpiFieldPaths.total)
    const vendorInfo = findFieldByPath(preflight, cfg.kpiFieldPaths.vendor)
    const dateInfo = findFieldByPath(preflight, cfg.kpiFieldPaths.date)

    const totalValue = totalInfo ? effectiveValue(totalInfo.field, totalInfo.key, fieldState) : '—'
    const vendorValue = vendorInfo ? effectiveValue(vendorInfo.field, vendorInfo.key, fieldState) : '—'
    const dateValue = dateInfo ? effectiveValue(dateInfo.field, dateInfo.key, fieldState) : '—'

    const totalHint = recordType === 'PO'
        ? 'Total amount of this Purchase Order — updates as you resolve fields'
        : 'Total amount confirmed by the vendor on this Acknowledgement'
    const vendorHint = recordType === 'PO'
        ? 'Vendor receiving this Purchase Order'
        : 'Vendor that issued this Acknowledgement'
    const dateHint = recordType === 'PO'
        ? 'Date this PO was placed'
        : 'Date the vendor confirmed shipping'

    return (
        <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center gap-6">
            <KpiCell
                icon={<DollarSign className="size-3.5" />}
                eyebrow={cfg.kpiLabels.total}
                value={totalValue}
                hint={totalHint}
            />
            <span className="h-8 w-px bg-border shrink-0" />
            <KpiCell
                icon={<Store className="size-3.5" />}
                eyebrow={cfg.kpiLabels.vendor}
                value={vendorValue}
                hint={vendorHint}
            />
            <span className="h-8 w-px bg-border shrink-0" />
            <KpiCell
                icon={<Calendar className="size-3.5" />}
                eyebrow={cfg.kpiLabels.date}
                value={dateValue}
                hint={dateHint}
            />
        </div>
    )
}
