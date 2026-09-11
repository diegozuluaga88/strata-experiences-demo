// SOURCE: ack-vs-po-demo + ExpertHubAppWrapper pattern
// ST-1169 · Diego 2026-09-09 · CEO Matt Danyliw pidió automatizar el compare
// manual de 12 pasos entre Order Bahn + Officeworks CORE.
//
// Fase 1 · shell del Expert Hub completo (4 tabs).
// Fase 2 · Flow A (notif Action Center) · processing staged reveal
//          (auto-pull steps) → ComparisonReviewModal REAL con mock que
//          tiene discrepancias para que el user las resuelva.
// Fase 3 · Flow B (drop PDFs) · processing staged reveal (OCR steps) →
//          MISMO ComparisonReviewModal con mock que también tiene
//          discrepancias · consistencia UX entre ambos flows.

import { useEffect, useMemo, useState } from 'react'
import { Cloud, ScanEye } from 'lucide-react'
import { TenantProvider } from '../../blocks/prod-imports/deps/TenantContext'
import ExpertHubTransactions from '../../blocks/prod-imports/ExpertHubTransactions'
import ExpertHubComparisons from '../../blocks/prod-imports/ExpertHubComparisons'
import ExpertHubOCRTracking from '../../blocks/prod-imports/ExpertHubOCRTracking'
import ExpertHubFeedbackBoard from '../../blocks/prod-imports/ExpertHubFeedbackBoard'
import Navbar from '../../blocks/prod-imports/deps/Navbar'
import ComparisonReviewModal from '../../blocks/prod-imports/deps/comparison/ComparisonReviewModal'
import { getMockComparisonReport } from '../../blocks/prod-imports/deps/comparison/mockComparisonData'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'
import AckVsPoIntakeBar from './AckVsPoIntakeBar'
import AckVsPoProcessingModal, { type ProcessingConfig } from './AckVsPoProcessingModal'

type Page = 'ocr-tracking' | 'transactions' | 'comparisons' | 'feedback'

const noop = () => {}

// ── Config staged reveal por flow ────────────────────────────────────────
// Flow A · notif Action Center · auto-pull de Officeworks CORE (4 steps).
const FLOW_A_CONFIG: ProcessingConfig = {
    triggerEvent: 'ack-vs-po:start-compare',
    icon: Cloud,
    tone: 'primary',
    kicker: 'Auto-compare · Officeworks CORE',
    getTitle: (d) => {
        const detail = d as { poNumber?: string; vendor?: string } | null
        return detail ? `${detail.poNumber ?? 'PO-2026-002'} · ${detail.vendor ?? 'Steelcase'}` : ''
    },
    steps: [
        { label: 'Connecting to Officeworks CORE',   detail: 'OAuth handshake · vendor SPECIAL T' },
        { label: 'Fetching PO header + footer',      detail: 'Buyer · ship-to · delivery date · totals' },
        { label: 'Loading line items',                detail: 'SKU · description · qty · unit price · required ship' },
        { label: 'Staging PO vs ACK for comparison', detail: 'Alignment by SKU + fuzzy match on description' },
    ],
}

// Flow B · drop PDFs · OCR extract (5 steps).
const FLOW_B_CONFIG: ProcessingConfig = {
    triggerEvent: 'ack-vs-po:pdfs-dropped',
    icon: ScanEye,
    tone: 'warning',
    kicker: 'OCR extract · unconnected (Flow B)',
    getTitle: (d) => {
        const detail = d as { fileCount?: number; fileNames?: string[] } | null
        if (!detail) return ''
        return `${detail.fileCount ?? 0} PDF${(detail.fileCount ?? 0) === 1 ? '' : 's'} · ${(detail.fileNames ?? []).join(' · ')}`
    },
    steps: [
        { label: 'Uploading PDFs to OCR engine',   detail: 'Files pushed to Strata OCR · Tesseract + LLM fallback' },
        { label: 'Extracting text + tables',        detail: 'Page segmentation · header/lines/footer detection' },
        { label: 'Parsing PO structured fields',    detail: 'Vendor · buyer · SKUs · qty · unit price · totals' },
        { label: 'Parsing ACK structured fields',   detail: 'Vendor confirmation · ship dates · adjustments' },
        { label: 'Cross-matching fields by SKU',    detail: 'Fuzzy match · 92% confidence average' },
    ],
}

export default function AckVsPoApp() {
    const [currentPage, setCurrentPage] = useState<Page>('comparisons')

    // ComparisonReviewModal state · abierto por CUALQUIER flow (Flow A vía
    // notif · Flow B vía OCR complete · consistency between triggers).
    // Ambos targets deben tener discrepancias mockeadas para que el demo
    // sea "resolvible" (Diego 2026-09-09).
    const [activeCompare, setActiveCompare] = useState<{ poNumber: string; ackId: string; source: 'flowA' | 'flowB' } | null>(null)
    const activeReport = useMemo(
        () => activeCompare ? getMockComparisonReport(activeCompare.poNumber, activeCompare.ackId) : null,
        [activeCompare]
    )

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

    // ST-1169 Fase 4.3 · Diego 2026-09-09 · badge count en Comparisons tab.
    // NOTA · Diego 2026-09-09 · el refinement del navbar (sin ExperienceSwitcher
    // + sin Transactions tab) era para el FIGMA (Fase 6) · no para el código.
    // El código mantiene el navbar full (con ExperienceSwitcher + Transactions).
    //
    // pendingCount hardcoded (5 = 3 Pending + 2 Discrepancy del COMPARISON_DOCS_ALL
    // mock). Fase 5 · reemplazar por CustomEvent 'ack-vs-po:pending-count-changed'
    // dispatched desde ExpertHubComparisons.
    const navbarProps = {
        navbarTabBadges: { Comparisons: 5 },
    }

    return (
        <TenantProvider>
            {currentPage === 'ocr-tracking' ? (
                <ExpertHubOCRTracking onLogout={noop} onNavigate={handleNavigate} {...navbarProps} />
            ) : currentPage === 'comparisons' ? (
                <ExpertHubComparisons
                    onLogout={noop}
                    onNavigate={handleNavigate}
                    intakeSlot={<AckVsPoIntakeBar />}
                    disableLegacyModals={true}
                    {...navbarProps}
                />
            ) : currentPage === 'feedback' ? (
                <ExpertHubFeedbackBoard onLogout={noop} onNavigate={handleNavigate} {...navbarProps} />
            ) : (
                <>
                    <Navbar
                        onLogout={noop}
                        activeTab={activeTabByPage[currentPage]}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                        leftSlot={<InlineExperienceSwitcher />}
                        tabBadges={navbarProps.navbarTabBadges}
                    />
                    <ExpertHubTransactions
                        onLogout={noop}
                        onNavigateToDetail={noop}
                        onNavigateToWorkspace={noop}
                        onNavigate={handleNavigate}
                    />
                </>
            )}

            {/* Flow A · processing modal (auto-pull staged reveal 4 steps)
                → al terminar abre ComparisonReviewModal con ACK-8840 (Steelcase
                · 15 items · 3 con discrepancias) · resolvibles inline. */}
            <AckVsPoProcessingModal
                config={FLOW_A_CONFIG}
                onComplete={(detail) => {
                    const d = detail as { poNumber?: string; ackId?: string } | null
                    setActiveCompare({
                        poNumber: d?.poNumber ?? 'PO-2026-002',
                        ackId: d?.ackId ?? 'ACK-8840',
                        source: 'flowA',
                    })
                }}
            />

            {/* Flow B · processing modal (OCR extract staged reveal 5 steps)
                → al terminar abre MISMO ComparisonReviewModal con ACK-8842
                (AIS Furniture · 5 items · 2 con discrepancias) · resolvibles
                inline. Consistencia total con Flow A · el user resuelve en
                el mismo modal independientemente del trigger. */}
            <AckVsPoProcessingModal
                config={FLOW_B_CONFIG}
                onComplete={() => {
                    setActiveCompare({
                        poNumber: 'PO-2026-004',
                        ackId: 'ACK-8842',
                        source: 'flowB',
                    })
                }}
            />

            <ComparisonReviewModal
                isOpen={!!activeCompare}
                onClose={() => {
                    if (activeCompare) {
                        window.dispatchEvent(new CustomEvent('ack-vs-po:card-highlight', {
                            detail: { ackId: activeCompare.ackId },
                        }))
                    }
                    setActiveCompare(null)
                }}
                processing={false}
                report={activeReport}
                onDecision={(action) => {
                    if (activeCompare && activeReport) {
                        // ST-1169 · Diego 2026-09-09 · dispatch commit event ·
                        // ExpertHubComparisons escucha para: (1) mostrar toast
                        // Strata (patrón useToast · no alert nativo), (2) agregar
                        // la card al grid si no existe, (3) highlight de la card
                        // recién creada/actualizada por 5s.
                        window.dispatchEvent(new CustomEvent('ack-vs-po:compare-committed', {
                            detail: {
                                ackId: activeCompare.ackId,
                                poNumber: activeCompare.poNumber,
                                vendor: activeReport.vendor,
                                action,
                                source: activeCompare.source,
                                lineItems: activeReport.validated_line_items?.length ?? 0,
                            },
                        }))
                    }
                    setActiveCompare(null)
                }}
            />
        </TenantProvider>
    )
}
