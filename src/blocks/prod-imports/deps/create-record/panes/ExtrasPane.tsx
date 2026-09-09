import { Info } from 'lucide-react'
import type { ExtraField } from '../types'

interface ExtrasPaneProps {
    extras: ExtraField[]
    setExtras: (next: ExtraField[]) => void
}

export default function ExtrasPane({ extras, setExtras }: ExtrasPaneProps) {
    const toggle = (id: string) =>
        setExtras(extras.map(x => (x.id === id ? { ...x, included: !x.included } : x)))

    const updateVal = (id: string, value: string) =>
        setExtras(extras.map(x => (x.id === id ? { ...x, value } : x)))

    const updateObj = (id: string, label: string, value: string) =>
        setExtras(
            extras.map(x => {
                if (x.id !== id || !x.objectValue) return x
                return {
                    ...x,
                    objectValue: {
                        ...x.objectValue,
                        values: x.objectValue.values.map(v => (v.label === label ? { ...v, value } : v)),
                    },
                }
            })
        )

    return (
        <div className="space-y-4">
            {/* Top info banner */}
            <div className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                        <Info className="size-4" />
                    </div>
                    <div className="text-[12.5px] text-muted-foreground leading-5">
                        Catalog fields outside the standard schema. Forwarded as-is without auto-matching — you own the value.
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {extras.map(x => (
                <div key={x.id} className={`rounded-xl border border-border bg-card overflow-hidden ${x.dataType === 'Object' ? 'lg:col-span-2' : ''}`}>
                    <div className="px-4 py-3 flex items-start gap-3 border-b border-border">
                        <input
                            type="checkbox"
                            checked={x.included}
                            onChange={() => toggle(x.id)}
                            title={x.included ? 'Uncheck to exclude this field from the record' : 'Check to include this field in the record'}
                            aria-label={`Include ${x.label}`}
                            className="mt-0.5 size-4 rounded border-[1.5px] border-zinc-400 dark:border-zinc-600 bg-card checked:bg-foreground checked:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors cursor-pointer accent-foreground"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13.5px] font-medium text-foreground">{x.label}</span>
                                {x.required && (
                                    <span title="This extra field must be included to create the record" className="text-[10px] font-semibold text-red-600 dark:text-red-400">REQUIRED</span>
                                )}
                            </div>
                            {!x.included && (
                                <div className="text-[11.5px] text-muted-foreground/80 mt-0.5">Not included in this publish</div>
                            )}
                        </div>
                    </div>

                    {x.included && (
                        <div className="px-4 py-3">
                            {x.dataType === 'Object' && x.objectValue ? (
                                <div className="relative pl-5 space-y-2">
                                    <div className="absolute left-[8px] top-2 bottom-2 w-px bg-border" />
                                    {x.objectValue.values.map(v => (
                                        <div key={v.label} className="relative grid grid-cols-[140px_1fr] gap-3 items-center">
                                            <div className="absolute -left-3 top-1/2 w-3 h-px bg-border" />
                                            <label className="text-[12.5px] text-muted-foreground font-medium">{v.label}</label>
                                            <input
                                                value={v.value}
                                                onChange={(e) => updateObj(x.id, v.label, e.target.value)}
                                                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    value={x.value || ''}
                                    onChange={(e) => updateVal(x.id, e.target.value)}
                                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                                />
                            )}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>
    )
}
