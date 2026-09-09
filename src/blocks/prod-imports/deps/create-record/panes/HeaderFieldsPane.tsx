import type { Preflight, FieldStateMap, FieldState } from '../types'
import FieldRow from '../field-row/FieldRow'
import ObjectFieldGroup from '../field-row/ObjectFieldGroup'

interface HeaderFieldsPaneProps {
    preflight: Preflight
    fieldState: FieldStateMap
    setFS: (key: string) => (patch: FieldState) => void
}

export default function HeaderFieldsPane({ preflight, fieldState, setFS }: HeaderFieldsPaneProps) {
    return (
        <div className="space-y-7">
            {preflight.sections.map((section) => (
                <section key={section.id}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                            {section.label}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                        {section.fields.map((f) => {
                            if (f.isObject) {
                                return (
                                    <div key={`${section.id}:${f.dtoPath}`} className="lg:col-span-2">
                                        <ObjectFieldGroup
                                            field={f}
                                            fieldState={fieldState}
                                            setFS={setFS}
                                            keyPrefix={`h:${section.id}:${f.dtoPath}`}
                                        />
                                    </div>
                                )
                            }
                            const key = `h:${section.id}:${f.dtoPath}`
                            return (
                                <FieldRow
                                    key={key}
                                    field={f}
                                    state={fieldState[key]}
                                    setState={setFS(key)}
                                />
                            )
                        })}
                    </div>
                </section>
            ))}
        </div>
    )
}
