import { useState } from 'react'
import { Folder, ChevronDown } from 'lucide-react'
import type { PreflightField, FieldStateMap } from '../types'
import FieldRow from './FieldRow'

interface ObjectFieldGroupProps {
    field: PreflightField
    fieldState: FieldStateMap
    setFS: (key: string) => (patch: import('../types').FieldState) => void
    keyPrefix: string
}

export default function ObjectFieldGroup({ field, fieldState, setFS, keyPrefix }: ObjectFieldGroupProps) {
    const [collapsed, setCollapsed] = useState(false)
    const children = field.children || []
    const childKeys = children.map(c => `${keyPrefix}:${c.dtoPath}`)

    const resolvedCount = children.filter((c, i) => {
        const st = fieldState[childKeys[i]]
        const r = (st && st.effectiveResolution) || c.resolution
        return r === 'resolved' || r === 'ai_suggested'
    }).length

    const hasIssue = children.some((c, i) => {
        const st = fieldState[childKeys[i]]
        const r = (st && st.effectiveResolution) || c.resolution
        return r === 'unresolved' || r === 'coercion_error' || r === 'ai_uncertain' || r === 'partial'
    })

    return (
        <div className={`rounded-xl border bg-card overflow-hidden ${
            hasIssue
                ? 'border-amber-200 dark:border-amber-800/60'
                : 'border-border'
        }`}>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
            >
                <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${
                    hasIssue
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                }`}>
                    <Folder className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-foreground">{field.displayName}</span>
                        <span className="text-[11px] text-muted-foreground/70">· {children.length} fields</span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                        {resolvedCount}/{children.length} ready
                        {hasIssue && <span className="text-amber-700 dark:text-amber-400"> · needs attention</span>}
                    </div>
                </div>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>
            {!collapsed && (
                <div className="border-t border-border bg-muted/30">
                    <div className="px-3 py-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {children.map((child, i) => {
                            const key = childKeys[i]
                            return (
                                <FieldRow
                                    key={key}
                                    field={child}
                                    state={fieldState[key]}
                                    setState={setFS(key)}
                                    compact
                                />
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
