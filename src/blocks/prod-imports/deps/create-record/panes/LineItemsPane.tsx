import { Fragment, useState } from 'react'
import { ChevronDown, Check, AlertTriangle } from 'lucide-react'
import type {
    Preflight,
    LineItem,
    PreflightField,
    FieldStateMap,
    FieldState,
    RecordType,
} from '../types'
import FieldRow from '../field-row/FieldRow'
import { formatFieldDisplay, reduceSummary } from '../usePreflight'

interface LineItemsPaneProps {
    preflight: Preflight
    fieldState: FieldStateMap
    setFS: (key: string) => (patch: FieldState) => void
}

interface ColumnSpec {
    dtoPath: string
    label: string
    align: 'left' | 'right'
    truncate?: boolean
    monoMuted?: boolean // grayed monospace style
}

const PO_COLUMNS: ColumnSpec[] = [
    { dtoPath: 'productNumber', label: 'Product', align: 'left' },
    { dtoPath: 'productDescription', label: 'Description', align: 'left', truncate: true },
    { dtoPath: 'quantity', label: 'Qty', align: 'right', monoMuted: true },
    { dtoPath: 'productList', label: 'List', align: 'right', monoMuted: true },
    { dtoPath: 'catalogCode', label: 'Catalog code', align: 'left' },
]

const ACK_COLUMNS: ColumnSpec[] = [
    { dtoPath: 'productNumber', label: 'Product', align: 'left' },
    { dtoPath: 'productDescription', label: 'Description', align: 'left', truncate: true },
    { dtoPath: 'ackQuantity', label: 'ACK Qty', align: 'right', monoMuted: true },
    { dtoPath: 'unitPrice', label: 'Unit Price', align: 'right', monoMuted: true },
    { dtoPath: 'lineStatus', label: 'Line Status', align: 'left' },
]

function columnsFor(recordType: RecordType): ColumnSpec[] {
    return recordType === 'PO' ? PO_COLUMNS : ACK_COLUMNS
}

function fieldByPath(li: LineItem, path: string): PreflightField | undefined {
    return li.fields.find(f => f.dtoPath === path)
}

function rowDisplay(field: PreflightField | undefined, fieldState: FieldStateMap, rowIndex: number) {
    if (!field) return '—'
    const key = `li${rowIndex}:${field.dtoPath}`
    const st = fieldState[key]
    const raw = st?.overrideValue != null ? st.overrideValue : (field.resolvedValue ?? field.inputValue)
    return formatFieldDisplay(raw as string | number | boolean | null, field.targetDataType, field.knownValues)
}

export default function LineItemsPane({ preflight, fieldState, setFS }: LineItemsPaneProps) {
    const [expanded, setExpanded] = useState<number | null>(null)
    const columns = columnsFor(preflight.recordType)

    // Flat for line items only — used to reduce per-row summary
    const allLineFields = preflight.lineItems.flatMap(li =>
        li.fields.map(f => ({ ...f, key: `li${li.rowIndex}:${f.dtoPath}`, group: 'line' as const, rowIndex: li.rowIndex }))
    )

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-muted/40 border-b border-border">
                            <th className="w-10" />
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                            {columns.map(col => (
                                <th
                                    key={col.dtoPath}
                                    className={`px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${
                                        col.align === 'right' ? 'text-right' : 'text-left'
                                    }`}
                                >
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preflight.lineItems.map(li => {
                            const rowFields = allLineFields.filter(f => f.rowIndex === li.rowIndex)
                            const rowSummary = reduceSummary(rowFields, fieldState)
                            const isExpanded = expanded === li.rowIndex

                            return (
                                <Fragment key={li.rowIndex}>
                                    <tr
                                        className={`border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/40' : ''}`}
                                        onClick={() => setExpanded(isExpanded ? null : li.rowIndex)}
                                        title={isExpanded ? 'Click to collapse row details' : 'Click to expand and resolve row issues'}
                                    >
                                        <td className="pl-3">
                                            <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                        </td>
                                        <td className="px-3 py-3 text-[12.5px] font-mono text-muted-foreground/70">{li.rowIndex + 1}</td>
                                        {columns.map(col => {
                                            const f = fieldByPath(li, col.dtoPath)
                                            const display = rowDisplay(f, fieldState, li.rowIndex)
                                            return (
                                                <td
                                                    key={col.dtoPath}
                                                    className={`px-3 py-3 text-[13px] ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${
                                                        col.truncate ? 'max-w-[220px] truncate' : ''
                                                    } ${col.monoMuted ? 'text-foreground/90' : 'text-foreground'}`}
                                                >
                                                    {display}
                                                </td>
                                            )
                                        })}
                                        <td className="px-3 py-3">
                                            {rowSummary.valid ? (
                                                <span title="All fields in this row are valid" className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 text-[10.5px] font-medium">
                                                    <Check className="size-3" /> Ready
                                                </span>
                                            ) : (
                                                <span title="One or more fields in this row need resolution" className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10.5px] font-medium">
                                                    <AlertTriangle className="size-3" /> Review
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-muted/30 border-b border-border">
                                            <td colSpan={columns.length + 3} className="px-6 py-4">
                                                <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
                                                    Row {li.rowIndex + 1} · needs attention
                                                </div>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    {rowFields
                                                        .filter(f => {
                                                            const st = fieldState[f.key]
                                                            const r = (st && st.effectiveResolution) || f.resolution
                                                            return r !== 'resolved'
                                                        })
                                                        .map(f => (
                                                            <FieldRow
                                                                key={f.key}
                                                                field={f}
                                                                state={fieldState[f.key]}
                                                                setState={setFS(f.key)}
                                                                compact
                                                            />
                                                        ))}
                                                    {rowSummary.valid && (
                                                        <div className="col-span-2 text-[13px] text-muted-foreground italic py-4 text-center">
                                                            All good in this row — nothing to resolve.
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="text-[12px] text-muted-foreground px-1">
                Click any row to expand and resolve issues.
            </div>
        </div>
    )
}
