import type { PreflightField, FieldState } from '../types'

interface BooleanEditableProps {
    field: PreflightField
    state?: FieldState
    setState: (patch: FieldState) => void
}

export default function BooleanEditable({ field, state, setState }: BooleanEditableProps) {
    const value = state?.overrideValue != null
        ? Boolean(state.overrideValue)
        : (field.resolvedValue === 'true' || field.resolvedValue === 1)

    return (
        <label className="inline-flex items-center gap-2 select-none cursor-pointer">
            <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                    setState({
                        overrideValue: e.target.checked,
                        locked: true,
                        effectiveResolution: 'resolved',
                    })
                }
                className="size-4 rounded border-[1.5px] border-zinc-400 dark:border-zinc-600 bg-card checked:bg-foreground checked:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors cursor-pointer accent-foreground"
            />
            <span className="text-[13px] text-foreground">{value ? 'Yes' : 'No'}</span>
        </label>
    )
}
