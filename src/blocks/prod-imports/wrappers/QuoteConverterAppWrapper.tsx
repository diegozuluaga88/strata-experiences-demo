// ─────────────────────────────────────────────────────────────────────────────
// SOURCE: quote-converter/src/App.tsx@HEAD (mini-app shell pattern)
// Lift for strata-experiences-demo · S4.a · 2026-09-08 · TT.56
//
// Mini-app shell for the Quote Converter "Published product" chapter · mismo
// patrón que ExpertHubAppWrapper (TT.55). Holds currentPage state y rutea entre
// los 3 destinos prod:
//   · 'ocr' (default)          → src/QuoteConverter.tsx (existing SIF Generator
//                                 slim page · lift completo del prod OCRTracking
//                                 con Kanban view + modales completos = S5)
//   · 'observability'          → QuoteConverterObservability (lifted S4.a · 45 LOC)
//   · 'feedback-status'        → QuoteConverterFeedbackStatusPage (lifted S4.a
//                                 · full FeedbackBoard user-scoped 348 LOC)
//
// El navbar del host se oculta (hasOwnProdNavbar en App.tsx) · el switcher se
// integra vía `leftSlot={<InlineExperienceSwitcher />}` (TT.55 pattern).
//
// Feedback dropdown del navbar prod tiene 2 acciones:
//   1. "Send feedback"       → abre FeedbackComposerModal
//   2. "My feedback status"  → navigate to feedback-status page
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { TenantProvider } from '../deps/TenantContext'
import Navbar from '../deps/quote-converter/Navbar'
import FeedbackComposerModal from '../deps/quote-converter/feedback/FeedbackComposerModal'
import { useUserFeedbacks } from '../deps/quote-converter/feedback/useUserFeedbacks'
import QuoteConverterObservability from '../QuoteConverterObservability'
import QuoteConverterFeedbackStatusPage from '../QuoteConverterFeedbackStatusPage'
// Actual OCR page — el existing src/QuoteConverter.tsx que ya renderea el SIF
// Generator (list/grid/upload/review). S5 lo reemplaza por el full prod lift
// con Kanban + modales avanzados.
import QuoteConverterOCR from '../../../QuoteConverter'
import InlineExperienceSwitcher from '../../../components/navbar/InlineExperienceSwitcher'

type Page = 'ocr' | 'observability' | 'feedback-status'

const noop = () => {}

// Wrapper interno · needs TenantProvider en scope antes de instanciar useUserFeedbacks
// (useUserFeedbacks depende de useAuth, no de useTenant — pero para consistencia con
// el rest del shell + para que futuros hooks tenant-aware queden cubiertos).
function QuoteConverterShell() {
    const [currentPage, setCurrentPage] = useState<Page>('ocr')
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
    const { addFeedback } = useUserFeedbacks()

    const handleNavigate = (page: string) => {
        if (page === 'observability') setCurrentPage('observability')
        else if (page === 'feedback-status') setCurrentPage('feedback-status')
        else setCurrentPage('ocr')
    }

    const activeTabByPage: Record<Page, string> = {
        'ocr': 'OCR',
        'observability': 'Observability',
        'feedback-status': 'OCR', // feedback status no es tab · sub-page of OCR context
    }

    return (
        <>
            {currentPage === 'observability' ? (
                <QuoteConverterObservability onLogout={noop} onNavigate={handleNavigate} />
            ) : currentPage === 'feedback-status' ? (
                <QuoteConverterFeedbackStatusPage onLogout={noop} onNavigate={handleNavigate} />
            ) : (
                <>
                    <Navbar
                        onLogout={noop}
                        activeTab={activeTabByPage[currentPage]}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                        onOpenFeedback={() => setIsFeedbackOpen(true)}
                        leftSlot={<InlineExperienceSwitcher />}
                    />
                    <QuoteConverterOCR onLogout={noop} onNavigateToWorkspace={noop} onNavigate={handleNavigate} />
                </>
            )}

            <FeedbackComposerModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                onSubmit={(submission) => {
                    addFeedback(submission)
                    setIsFeedbackOpen(false)
                }}
            />
        </>
    )
}

export default function QuoteConverterAppWrapper() {
    return (
        <TenantProvider>
            <QuoteConverterShell />
        </TenantProvider>
    )
}
