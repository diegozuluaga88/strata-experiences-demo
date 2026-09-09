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
import { TenantProvider } from '../deps/TenantContext'
import ExpertHubTransactions from '../ExpertHubTransactions'
import ExpertHubComparisons from '../ExpertHubComparisons'
// TT.60 · S2 + S3 · Diego 2026-09-08 · OCR Tracking + FeedbackBoard full lifts
// desde ack-vs-po-demo · reemplazan los placeholder cards que teníamos en las
// tabs OCR y Feedback (S1 shipped solo Transactions + Comparisons).
import ExpertHubOCRTracking from '../ExpertHubOCRTracking'
import ExpertHubFeedbackBoard from '../ExpertHubFeedbackBoard'
// El Navbar YA lo renderean internamente OCR/Feedback/Comparisons pages ·
// solo Transactions requiere Navbar wrapper explícito (mismo pattern que
// el prod expert-hub App.tsx line 64).
import Navbar from '../deps/Navbar'
// TT.55 · switcher inline · injected as leftSlot en cada Navbar wire.
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
            {currentPage === 'ocr-tracking' ? (
                // TT.60 · S2 · full OCR pipeline (Kanban · Upload · Preflight ·
                // Review · Deprecated · CreateRecord · AITrainingConsent). La
                // page renderea su propio <Navbar /> con leftSlot ya wireado.
                <ExpertHubOCRTracking onLogout={noop} onNavigate={handleNavigate} />
            ) : currentPage === 'comparisons' ? (
                <ExpertHubComparisons onLogout={noop} onNavigate={handleNavigate} />
            ) : currentPage === 'feedback' ? (
                // TT.60 · S3 · full FeedbackBoard (list · detail · assign · chat ·
                // upvotes · state overrides). Page renderea su propio <Navbar />.
                <ExpertHubFeedbackBoard onLogout={noop} onNavigate={handleNavigate} />
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

// TT.60 · PlaceholderPage removido · OCR y Feedback ya montan páginas reales.
