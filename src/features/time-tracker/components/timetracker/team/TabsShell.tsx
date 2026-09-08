// TT.42 · Diego 2026-09-07 · Team View sub-tabs · underline segmented control.
// Pattern reusable · render prop pasa el activeTabId a children.

import { useState, type ReactNode } from 'react'

export interface TabDef {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
    badgeTone?: 'muted' | 'warning' | 'destructive'
    /** TT.42.1 · Diego 2026-09-07 · tooltip explaining what the tab shows and
     *  what the manager can do there. Rendered via native `title` attribute. */
    description?: string
}

interface Props {
    tabs: TabDef[]
    defaultTabId?: string
    children: (activeTabId: string) => ReactNode
}

export default function TabsShell({ tabs, defaultTabId, children }: Props) {
    const [active, setActive] = useState<string>(defaultTabId ?? tabs[0]?.id ?? '')

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = active === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActive(tab.id)}
                            title={tab.description}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={tab.description ? `${tab.label} · ${tab.description}` : tab.label}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {tab.badge != null && tab.badge > 0 && (
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums ${
                                    tab.badgeTone === 'destructive' ? 'bg-destructive text-destructive-foreground' :
                                    tab.badgeTone === 'warning' ? 'bg-warning text-warning-foreground' :
                                    'bg-muted text-foreground'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
            <div>{children(active)}</div>
        </div>
    )
}
