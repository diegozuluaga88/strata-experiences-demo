// SOURCE: quote-converter/src/Observability.tsx (skeleton) · rewritten para
// strata-experiences-demo · S4.a.1 · TT.57 · 2026-09-08
//
// Diego pidió replicar el mockup de Figma "Observability · With data
// (third-party embed)" que muestra un embedded dashboard con 6 KPIs +
// bar chart + Top-5 Longest Documents table · en lugar del placeholder
// "No dashboards available" del prod actual.
//
// El banner "Embedded dashboard — rendered by the analytics provider,
// not styled by Strata" hace explícito el disclaimer visual: no somos
// dueños de estos estilos, es la vista embebida del proveedor de analytics.
// Live · expires 15m + PDF to Sif (dark) dropdown top-right son controls
// del provider view · no acciones nativas.

import { useState } from 'react'
import { Info, ChevronDown, RotateCw, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from './deps/quote-converter/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'

interface ObservabilityProps {
    onLogout: () => void
    onNavigate: (page: string) => void
}

const CHART_DATA = [{ type: 'quote', count: 6 }]

const TOP_DOCS = [
    { jobId: '0d7bba81-f95f-4c7b-99aa-6496758496ad', docType: 'quote', state: 'READY_FOR_SYNC', createdAt: 'August 14, 2026', sent: 'Aug 14, 2026', ocr: 'Aug 14, 2026', capture: 1.5, human: 0.0, total: 0.0 },
    { jobId: '198a8e2c-1940-4fc2-924a-0e677769c43f', docType: 'quote', state: 'READY_FOR_SYNC', createdAt: 'August 14, 2026', sent: 'Aug 14, 2026', ocr: 'Aug 14, 2026', capture: 1.6, human: 0.0, total: 0.0 },
    { jobId: '85cfb6d0-73b2-44f3-85cf-bbf42034dab5', docType: 'quote', state: 'READY_FOR_SYNC', createdAt: 'August 14, 2026', sent: 'Aug 14, 2026', ocr: 'Aug 14, 2026', capture: 0.8, human: 0.0, total: 0.0 },
    { jobId: '934db6b3-76cb-47cd-8c88-a2a46c6c3d1d', docType: 'quote', state: 'READY_FOR_SYNC', createdAt: 'August 14, 2026', sent: 'Aug 14, 2026', ocr: 'Aug 14, 2026', capture: 1.6, human: 0.0, total: 0.0 },
    { jobId: '5a4de0a6-6365-4bb5-b647-eecba19c292b', docType: 'quote', state: 'READY_FOR_SYNC', createdAt: 'August 14, 2026', sent: 'Aug 14, 2026', ocr: 'Aug 14, 2026', capture: 1.6, human: 0.0, total: 0.0 },
]

export default function QuoteConverterObservability({ onLogout, onNavigate }: ObservabilityProps) {
    const [range, setRange] = useState<'5days' | '30days' | '90days'>('5days')
    const rangeLabel = range === '5days' ? 'Last 5 days' : range === '30days' ? 'Last 30 days' : 'Last 90 days'

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            <Navbar
                onLogout={onLogout}
                activeTab="Observability"
                onNavigateToWorkspace={() => onNavigate('ocr')}
                onNavigate={onNavigate}
                leftSlot={<InlineExperienceSwitcher />}
            />

            <div className="pt-24 px-4 max-w-screen-2xl mx-auto space-y-4">
                {/* TT.57.2 · Diego 2026-09-08 · breadcrumb + provider controls dentro
                     del content pt-24 · parity con OCR / Comparisons de otras secciones ·
                     antes estaban fixed top-2 y quedaban DESPEGADAS del navbar. */}
                <div className="flex items-center justify-between gap-3 flex-wrap px-1">
                    <Breadcrumbs items={[
                        { label: 'Dealer Experience', onClick: () => onNavigate('ocr') },
                        { label: 'Observability', active: true },
                    ]} />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors"
                            title="Provider view"
                        >
                            PDF to Sif (dark)
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                            </span>
                            Live · expires 15m
                        </span>
                    </div>
                </div>

                {/* Info banner · disclaimer del proveedor */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Embedded dashboard — rendered by the analytics provider, not styled by Strata</span>
                    <button
                        type="button"
                        className="ml-1 p-1 rounded-md hover:bg-muted transition-colors"
                        title="Refresh"
                        aria-label="Refresh dashboard"
                    >
                        <RotateCw className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">Controls</span>
                    <span className="text-sm text-muted-foreground">Created At</span>
                    <div className="relative">
                        <select
                            value={range}
                            onChange={(e) => setRange(e.target.value as any)}
                            className="appearance-none inline-flex items-center gap-1.5 text-xs font-medium pl-3 pr-8 py-1.5 rounded-md border border-border bg-card text-foreground hover:bg-muted cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label="Range"
                        >
                            <option value="5days">Last 5 days</option>
                            <option value="30days">Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    </div>
                    <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                        title="Reset filters"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Reset
                    </button>
                </div>

                {/* TT.57.1 · Diego 2026-09-08 · grid distribution matches Figma
                     reference: 5-col grid con chart card tall (col-span-2 · row-span-2)
                     a la derecha · 3 KPIs por row (Documents/InFlight/Errors ·
                     Avg times) a la izquierda. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard label="Documents Converted to SIF" value="6" />
                    <KpiCard label="In Flight Documents" value="15" />
                    <KpiCard label="Number Of Errors" value="1" tone="destructive" />
                    <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
                        <ChartCard label="Documents Converted to SIF by Type" data={CHART_DATA} rangeLabel={rangeLabel} />
                    </div>
                    <KpiCard label="Avg Capture Time (min)" value="1.4" />
                    <KpiCard label="Avg Human Process Time (hrs)" value="0.09" />
                    <KpiCard label="Avg Total Time (hrs)" value="0.11" />
                </div>

                {/* Top 5 Longest Documents to Convert */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h3 className="text-sm font-semibold text-foreground">Top 5 Longest Documents to Convert</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ranked by total processing time · {rangeLabel.toLowerCase()}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border bg-muted/30 text-left">
                                    {['Job_id', 'Document Type', 'State', 'Created at', 'Sent to Human Review', 'OCR Completed', 'Capture Time (min)', 'Human Process Time (days)', 'Total Time (days)'].map(h => (
                                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {TOP_DOCS.map(d => (
                                    <tr key={d.jobId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2.5 font-mono text-[11px] text-foreground whitespace-nowrap">{d.jobId}</td>
                                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{d.docType}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-soft text-success-foreground/90 dark:text-success">{d.state}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{d.createdAt}</td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{d.sent}</td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{d.ocr}</td>
                                        <td className="px-3 py-2.5 text-right text-foreground tabular-nums whitespace-nowrap">{d.capture.toFixed(1)}</td>
                                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums whitespace-nowrap">{d.human.toFixed(1)}</td>
                                        <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums whitespace-nowrap">{d.total.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function KpiCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'destructive' }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 min-h-[140px] flex flex-col">
            <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
            <p className={`mt-3 text-4xl font-semibold tabular-nums leading-none ${tone === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
                {value}
            </p>
        </div>
    )
}

function ChartCard({ label, data, rangeLabel }: { label: string; data: { type: string; count: number }[]; rangeLabel: string }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 h-full flex flex-col min-h-[300px]">
            <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
            <div className="flex-1 mt-3 -mx-2 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(from var(--border) r g b / 0.5)" />
                        <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'rgb(from var(--muted-foreground) r g b / 1)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'rgb(from var(--muted-foreground) r g b / 1)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: 'rgb(from var(--muted) r g b / 0.4)' }}
                            contentStyle={{
                                background: 'rgb(from var(--card) r g b / 1)',
                                border: '1px solid rgb(from var(--border) r g b / 1)',
                                borderRadius: 8,
                                fontSize: 11,
                                padding: '6px 8px',
                            }}
                        />
                        <Bar dataKey="count" fill="rgb(from var(--primary) r g b / 1)" radius={[4, 4, 0, 0]} maxBarSize={220} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">{rangeLabel.toLowerCase()}</p>
        </div>
    )
}
