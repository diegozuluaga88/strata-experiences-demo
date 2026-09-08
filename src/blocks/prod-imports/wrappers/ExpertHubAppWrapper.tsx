// ─────────────────────────────────────────────────────────────────────────────
// SOURCE: expert-hub/src/App.tsx@f59da74 (mini-app shell pattern)
// Lift for strata-experiences-demo · S1 · 2026-09-08 · TT.50.S1
//
// Mini-app shell for the Expert Hub "Published product" chapter. Holds
// currentPage state and routes between the 4 prod tabs (OCR · Transactions ·
// Comparisons · Feedback) that live inside prod-imports/. S1 wires
// Transactions (existing lift) + Comparisons (new S1 lift). S2 adds OCR ·
// S3 adds FeedbackBoard.
//
// Until S2/S3 land, OCR and Feedback tabs render an interim placeholder card
// so the navbar shape stays honest (all 4 tabs visible, matches prod) instead
// of silently no-op-ing.
//
// Replaces the previous 1-page ExpertHubTransactionsWrapper.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { ScanEye, MessageSquare, Clock, Sparkles } from 'lucide-react'
import { TenantProvider } from '../deps/TenantContext'
import Navbar from '../deps/Navbar'
import ExpertHubTransactions from '../ExpertHubTransactions'
import ExpertHubComparisons from '../ExpertHubComparisons'
// TT.55 · Diego 2026-09-08 · switcher inline · injected as leftSlot en el
// Navbar prod (parity visual con el Tenant dropdown al lado).
import InlineExperienceSwitcher from '../../../components/navbar/InlineExperienceSwitcher'

type Page = 'ocr-tracking' | 'transactions' | 'comparisons' | 'feedback'

const noop = () => {}

export default function ExpertHubAppWrapper() {
    const [currentPage, setCurrentPage] = useState<Page>('transactions')

    const handleNavigate = (page: string) => {
        if (page === 'ocr-tracking' || page === 'transactions' || page === 'comparisons' || page === 'feedback') {
            setCurrentPage(page)
        }
    }

    const activeTabByPage: Record<Page, string> = {
        'ocr-tracking': 'OCR',
        'transactions': 'Transactions',
        'comparisons': 'Comparisons',
        'feedback': 'Feedback',
    }

    return (
        <TenantProvider>
            {currentPage === 'comparisons' ? (
                // Comparisons renders its own <Navbar /> internally (mirrors prod).
                <ExpertHubComparisons onLogout={noop} onNavigate={handleNavigate} />
            ) : currentPage === 'ocr-tracking' ? (
                <>
                    <Navbar
                        onLogout={noop}
                        activeTab={activeTabByPage[currentPage]}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                        leftSlot={<InlineExperienceSwitcher />}
                    />
                    <PlaceholderPage
                        icon={ScanEye}
                        title="OCR Tracking"
                        subtitle="Coming in Session 2 of the Expert Hub refinement pass"
                        note="Prod ships an OCR pipeline with upload · preflight · document review · deprecated grid · training-data consent. Landing here in the next iteration."
                    />
                </>
            ) : currentPage === 'feedback' ? (
                <>
                    <Navbar
                        onLogout={noop}
                        activeTab={activeTabByPage[currentPage]}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                        leftSlot={<InlineExperienceSwitcher />}
                    />
                    <PlaceholderPage
                        icon={MessageSquare}
                        title="Feedback Board"
                        subtitle="Coming in Session 3 of the Expert Hub refinement pass"
                        note="Prod ships a feedback board with detail modal · assign flow · chat · upvotes · state overrides persisted per user. Landing here after OCR."
                    />
                </>
            ) : (
                <>
                    <Navbar
                        onLogout={noop}
                        activeTab={activeTabByPage[currentPage]}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                        leftSlot={<InlineExperienceSwitcher />}
                    />
                    <ExpertHubTransactions
                        onLogout={noop}
                        onNavigateToDetail={noop}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                    />
                </>
            )}
        </TenantProvider>
    )
}

function PlaceholderPage({ icon: Icon, title, subtitle, note }: { icon: any; title: string; subtitle: string; note: string }) {
    return (
        <div className="min-h-screen bg-background pt-32 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-border flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground leading-relaxed">{note}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Refinement plan · S1 (this) · S2 OCR · S3 Feedback · S4-S5 Quote Converter</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
