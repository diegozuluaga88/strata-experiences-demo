// SOURCE: ack-vs-po-demo/src/Comparisons.tsx@455a5b7 (Sep 2026 refined pass)
// Re-lift para strata-experiences-demo · TT.59 · 2026-09-08
// Refinamientos vs S1 (expert-hub@f59da74):
//   · DE1.4 · default view mode 'list'
//   · DE1.10 · Live updates paused pill + Create Record success dialog
//   · DE1.11 · paridad columnas + navbar
//   · DE1.18 · Comparisons cards OCR-style vía wrappers/ComparisonDocCard
//   · DE1.19+20 · Compare button gated + separar Brand column
//   · DE1.21 · avatar = reviewer (persona) match prod
//   · DE1.22-25 · Compare icon-only + align fix + brand color + grid default
//   · DE1.26 · quitar icono GitCompare del title Comparisons
//
// Adaptations al shell experiences: import paths remapped `./components/*` →
// `./deps/*` · Navbar wire agrega leftSlot={<InlineExperienceSwitcher />}
// para el chip Experience integrado (TT.55/58 pattern).
import { useState, useMemo, useEffect } from 'react'
import { Search, List, LayoutGrid, FileText, GitCompare, CheckCircle2, AlertTriangle, FileSearch, Cloud } from 'lucide-react'

// ST-1169 · Flow C · Diego 2026-09-11 · search-by-PO detection.
// Cuando el user escribe/pastea un PO number en el search input:
//   · Si hay match local → filtra normalmente (comportamiento actual)
//   · Si NO hay match local Y query tiene forma de PO → aparece hint
//     "Pull PO-XXX from Officeworks CORE →" que dispatcha el evento
//     existente `ack-vs-po:start-compare` (reusa Flow A processing).
// Traducción del step 4-5 del proceso manual CORE (copiar PO del ACK
// preview + pastear en CORE search + ver lines).
const PO_PATTERN = /^PO[\s-]?\d{2,}[\s-]?\d{0,}$/i
function normalizePo(q: string): string {
    return q.trim().toUpperCase().replace(/\s+/g, '-')
}
import Navbar from './deps/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import DocTypeChip from './deps/ocr/DocTypeChip'
import { avatarGradient, getTeamMember, CURRENT_USER_ID } from './deps/team/teamMembers'
import { ToastContainer, useToast } from './deps/AuthToast'
import ComparisonLauncher from './deps/comparison/ComparisonLauncher'
// DE1.18 · Diego 2026-09-02 · card local con layout OCR-style para paridad
// visual con gostrata.app premain. Vive en wrappers/ · no toca comparison/*.
import ComparisonDocCard from './deps/comparison/wrappers/ComparisonDocCard'
import AckReconciliationModal from './deps/AckReconciliationModal'
import ResolveInconsistencyModal from './deps/ResolveDiscrepancyModal'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'

interface ComparisonsProps {
    onLogout: () => void
    onNavigate: (page: string) => void
    // ST-1169 Fase 1.D · Diego 2026-09-09 · esconder los 2 modales viejos
    // (AckReconciliationModal + ResolveInconsistencyModal) que compiten con
    // el flujo canónico ACK vs PO. Default false preserva el comportamiento
    // existente para ExpertHubAppWrapper y otros consumers.
    disableLegacyModals?: boolean
    // ST-1169 Fase 1 fix · Diego 2026-09-09 · cuando el host ya monta su
    // propio Navbar (con ActionCenter para las notifs), el consumer pasa
    // hideNavbar=true para evitar duplicación de chrome. Default false.
    hideNavbar?: boolean
    // ST-1169 Fase 1.B (integrado) · Diego 2026-09-09 · slot renderizado
    // en la toolbar del Comparisons card (al lado del search + view toggle).
    // Aca vive el botón/dropzone del intake Flow B para que no compita con
    // la lista como un banner separado.
    intakeSlot?: React.ReactNode
    // ST-1169 Fase 1.A (relocated) · Diego 2026-09-09 · banner sobre el
    // comparisons card (donde antes vivía el Action Center bell) · trigger
    // del Flow A auto-pull. Se pinta después del breadcrumb, antes del card.
    notifBanner?: React.ReactNode
    /** ST-1169 · omit InlineExperienceSwitcher chip del Navbar interno · default true. */
    navbarSwitcher?: boolean
    /** ST-1169 · tabs a ocultar del center-nav del Navbar interno. */
    navbarHiddenTabs?: string[]
    /** ST-1169 · badge counts por tab name del Navbar interno. */
    navbarTabBadges?: Record<string, number>
}

type CompareStatus = 'Pending' | 'Reviewed' | 'Discrepancy' | 'Completed'
// DE1.18 · Diego 2026-09-02 · partición del listado por tipo (PO/ACK) para
// paridad con prod · antes se filtraba por status (Pending/Reviewed/etc).
type CompareDocType = 'Purchase Order' | 'Acknowledgment'

interface ComparisonDoc {
    /** Doc id (matches mock comparison keys, e.g. "ACK-8840" o "PO-2026-002"). */
    id: string
    vendor: string
    // DE1.18 · type explícito · antes hardcoded como Acknowledgment.
    type: CompareDocType
    // DE1.18 · filename estilo prod (ej. "PO KT2131.001.01.pdf").
    name: string
    // DE1.18 · sub-code opcional debajo del vendor (ej. "KT2131.001.01").
    subCode?: string
    // DE1.21 · Diego 2026-09-03 · assignee (persona que revisa) · el círculo
    // en Actions muestra las iniciales de este user, NO las del vendor.
    // Default 'me' (Diego Zuluaga) si no se especifica.
    assigneeId?: string
    /** DE1.3 · Diego 2026-09-01 · optional para modelar ACKs huérfanos
     *  (llegaron del vendor pero el PO nunca se emitió). Los huérfanos
     *  se ocultan del listado por la regla del demo (ver COMPARISON_DOCS). */
    relatedPo?: string
    status: CompareStatus
    reviewStatus: 'Reviewed' | 'Pending For Review'
    date: string
    initials: string
    lineItems: number
}

// Each row is an Acknowledgment paired with the Purchase Order it confirms.
// The PO::ACK pairs map to real reports in mockComparisonData (getMockComparisonReport).
//
// DE1.3 · Diego 2026-09-01 · demo template rule ·
// ACK sin PO relacionado NUNCA se muestra en el listado de Comparisons
// (ni se puede comparar). Los 2 últimos entries de _ALL son "huérfanos"
// intencionales para validar visualmente que el filtro los esconde ·
// sin ellos la regla es no-op y no se puede probar.
// DE1.18 · Diego 2026-09-02 · dataset ampliado · antes solo había ACKs.
// Ahora incluye entries `type: 'Purchase Order'` para que la tab
// Purchase Orders tenga contenido (paridad con prod que particiona por tipo).
// Los IDs y linked counterparts respetan el mapeo original (los ACK-* que
// tenían `relatedPo: PO-2026-*` ahora también tienen entries PO-2026-*
// standalone visibles bajo la tab PO).
const COMPARISON_DOCS_ALL: ComparisonDoc[] = [
    // DE1.21 · assigneeId distribuye reviewers entre miembros del team ·
    // por default 'me' (Diego Zuluaga) · el resto usa ids del TEAM_MEMBERS.
    // ── Acknowledgements ────────────────────────────────────────────────
    { id: 'ACK-8840', vendor: 'Steelcase', type: 'Acknowledgment', name: 'ACK-8840_Steelcase.pdf', relatedPo: 'PO-2026-002', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'Jan 13, 2026', initials: 'SC', lineItems: 50, assigneeId: 'me' },
    { id: 'ACK-8841', vendor: 'Knoll', type: 'Acknowledgment', name: 'ACK-8841_Knoll.pdf', relatedPo: 'PO-2026-003', status: 'Pending', reviewStatus: 'Pending For Review', date: 'Jan 12, 2026', initials: 'KN', lineItems: 12, assigneeId: 'carlos' },
    { id: 'ACK-8842', vendor: 'AIS Furniture', type: 'Acknowledgment', name: 'ACK-8842_AIS.pdf', relatedPo: 'PO-2026-004', status: 'Pending', reviewStatus: 'Pending For Review', date: 'Jan 15, 2026', initials: 'AI', lineItems: 6, assigneeId: 'daniela' },
    { id: 'ACK-8839', vendor: 'Herman Miller', type: 'Acknowledgment', name: 'ACK-8839_HermanMiller.pdf', relatedPo: 'PO-2026-001', status: 'Reviewed', reviewStatus: 'Reviewed', date: 'Jan 14, 2026', initials: 'HM', lineItems: 8, assigneeId: 'me' },
    { id: 'ACK-330357', vendor: 'ergotron', type: 'Acknowledgment', name: 'ACK-330357_ergotron.pdf', relatedPo: 'PO-330357', status: 'Reviewed', reviewStatus: 'Reviewed', date: '21 days ago', initials: 'EG', lineItems: 3, assigneeId: 'christian' },
    { id: 'ACK-7855', vendor: 'Knoll', type: 'Acknowledgment', name: 'ACK-7855_Knoll.pdf', relatedPo: 'PO-4501', status: 'Pending', reviewStatus: 'Pending For Review', date: '5 days ago', initials: 'KN', lineItems: 3, assigneeId: 'jennifer' },
    { id: 'ACK-7839', vendor: 'Steelcase', type: 'Acknowledgment', name: 'ACK-7839_Steelcase.pdf', relatedPo: 'PO-1027', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'today', initials: 'SC', lineItems: 4, assigneeId: 'me' },
    { id: 'ACK-9001', vendor: 'OFS Brands', type: 'Acknowledgment', name: 'ACK-9001_OFS.pdf', relatedPo: 'PO-7741', status: 'Completed', reviewStatus: 'Reviewed', date: '14 days ago', initials: 'OF', lineItems: 2, assigneeId: 'carlos' },
    // ── Purchase Orders ──────────────────────────────────────────────────
    { id: 'PO-2026-002', vendor: 'Steelcase', type: 'Purchase Order', name: 'PO-2026-002_Steelcase.pdf', subCode: 'KT2131.001.02', relatedPo: 'ACK-8840', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'Jan 13, 2026', initials: 'SC', lineItems: 50, assigneeId: 'me' },
    { id: 'PO-2026-003', vendor: 'Knoll', type: 'Purchase Order', name: 'PO-2026-003_Knoll.pdf', subCode: 'KT2131.001.03', relatedPo: 'ACK-8841', status: 'Pending', reviewStatus: 'Pending For Review', date: 'Jan 12, 2026', initials: 'KN', lineItems: 12, assigneeId: 'daniela' },
    { id: 'PO-2026-001', vendor: 'Herman Miller', type: 'Purchase Order', name: 'PO-2026-001_HermanMiller.pdf', subCode: 'KT2131.001.01', relatedPo: 'ACK-8839', status: 'Reviewed', reviewStatus: 'Reviewed', date: 'Jan 14, 2026', initials: 'HM', lineItems: 8, assigneeId: 'me' },
    { id: 'PO-1027', vendor: 'Steelcase', type: 'Purchase Order', name: 'PO-1027_Steelcase.pdf', relatedPo: 'ACK-7839', status: 'Discrepancy', reviewStatus: 'Pending For Review', date: 'today', initials: 'SC', lineItems: 4, assigneeId: 'christian' },
    { id: 'PO-7741', vendor: 'OFS Brands', type: 'Purchase Order', name: 'PO-7741_OFS.pdf', relatedPo: 'ACK-9001', status: 'Completed', reviewStatus: 'Reviewed', date: '14 days ago', initials: 'OF', lineItems: 2, assigneeId: 'jennifer' },
    // DE1.3 · huérfanos (sin PO) · deben quedar ocultos
    { id: 'ACK-8845', vendor: 'AIS Furniture', type: 'Acknowledgment', name: 'ACK-8845_AIS.pdf', status: 'Pending', reviewStatus: 'Pending For Review', date: 'today', initials: 'AI', lineItems: 4 },
    { id: 'ACK-9022', vendor: 'Herman Miller', type: 'Acknowledgment', name: 'ACK-9022_HermanMiller.pdf', status: 'Pending', reviewStatus: 'Pending For Review', date: 'yesterday', initials: 'HM', lineItems: 7 },
]

// DE1.3 · filtro dura · si no hay PO relacionado, el ACK no llega al UI.
const COMPARISON_DOCS: ComparisonDoc[] = COMPARISON_DOCS_ALL.filter(d => !!d.relatedPo)

// DE1.18 · Diego 2026-09-02 · tabs sincronizados con prod
// (dev.gostrata.app/expert-hub/comparisons) · particiona por tipo de doc
// (PO/ACK) · antes eran 5 tabs por status (all/pending/reviewed/etc).
const FUNNEL: { id: 'po' | 'ack'; label: string; type: CompareDocType }[] = [
    { id: 'po', label: 'Purchase Orders', type: 'Purchase Order' },
    { id: 'ack', label: 'Acknowledgements', type: 'Acknowledgment' },
]

function statusClasses(s: CompareStatus): string {
    switch (s) {
        case 'Reviewed':
        case 'Completed': return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-500/15 ring-1 ring-inset ring-green-600/20'
        case 'Discrepancy': return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-500/15 ring-1 ring-inset ring-red-600/20'
        default: return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15 ring-1 ring-inset ring-amber-600/20'
    }
}

export default function Comparisons({ onLogout, onNavigate, disableLegacyModals = false, hideNavbar = false, intakeSlot, notifBanner, navbarSwitcher = true, navbarHiddenTabs, navbarTabBadges }: ComparisonsProps) {
    // DE1.19 · Diego 2026-09-03 · default 'ack' (era 'po') · en el flow
    // del demo el usuario arranca revisando Acknowledgements (donde vive
    // el botón Compare) · la tab PO existe pero por ahora sin acción compare.
    const [activeTab, setActiveTab] = useState<'po' | 'ack'>('ack')
    const [query, setQuery] = useState('')
    // DE1.4 · Diego 2026-09-02 · list como default (era 'grid').
    // DE1.25 · Diego 2026-09-03 · revert · card (grid) de vuelta como default
    // en Comparisons · las cards con layout OCR-style (DE1.18) son ahora
    // la vista primaria para paridad visual con prod.
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const { toasts, addToast, dismissToast } = useToast()

    const [compareDoc, setCompareDoc] = useState<ComparisonDoc | null>(null)
    const [isReconciliationOpen, setIsReconciliationOpen] = useState(false)
    const [resolveDoc, setResolveDoc] = useState<{ id: string; name: string; vendor: string; inconsistencyCount: number } | null>(null)
    // ST-1169 · Diego 2026-09-09 · highlight de la card cuya comparación se
    // acaba de completar via Flow A (notif Action Center) · dispatched como
    // CustomEvent 'ack-vs-po:card-highlight' desde el AckVsPoApp. Auto-clear
    // en 5s. Aplica ring lime + subtle scale bump para reconocerla.
    const [highlightedAckId, setHighlightedAckId] = useState<string | null>(null)
    // ST-1169 · Diego 2026-09-09 · cards net-new agregadas via Flow A/B commit ·
    // dispatched como CustomEvent 'ack-vs-po:compare-committed' desde el
    // AckVsPoApp. Se prepend al listado + highlight + toast Strata (no alert).
    const [extraDocs, setExtraDocs] = useState<ComparisonDoc[]>([])
    useEffect(() => {
        const onHighlight = (e: Event) => {
            const detail = (e as CustomEvent).detail as { ackId?: string }
            if (!detail?.ackId) return
            setActiveTab('ack') // switch a Acknowledgements para que el user vea la card
            setHighlightedAckId(detail.ackId)
            const t = setTimeout(() => setHighlightedAckId(null), 5000)
            return () => clearTimeout(t)
        }
        const onCommitted = (e: Event) => {
            const detail = (e as CustomEvent).detail as {
                ackId?: string; poNumber?: string; vendor?: string;
                action?: 'ACCEPT' | 'REJECT' | 'REQUEST_REVIEW';
                source?: 'flowA' | 'flowB'; lineItems?: number;
            }
            if (!detail?.ackId || !detail?.poNumber) return
            const verbMap = { ACCEPT: 'accepted', REJECT: 'rejected', REQUEST_REVIEW: 'flagged for review' } as const
            const verb = verbMap[detail.action ?? 'ACCEPT']
            const sink = detail.source === 'flowA' ? 'pushed to Officeworks CORE' : 'saved locally · export ready'
            const toneMap = { ACCEPT: 'success', REJECT: 'error', REQUEST_REVIEW: 'info' } as const
            addToast(toneMap[detail.action ?? 'ACCEPT'], `${detail.ackId} vs ${detail.poNumber} ${verb} · ${sink}`)
            // Add card (prepend) si no existe ya en la lista
            const alreadyExists = COMPARISON_DOCS.some(d => d.id === detail.ackId) || extraDocs.some(d => d.id === detail.ackId)
            if (!alreadyExists) {
                const newDoc: ComparisonDoc = {
                    id: detail.ackId,
                    vendor: detail.vendor ?? 'Vendor',
                    type: 'Acknowledgment',
                    name: `${detail.ackId}_${(detail.vendor ?? 'Vendor').replace(/\s/g, '')}.pdf`,
                    relatedPo: detail.poNumber,
                    status: detail.action === 'ACCEPT' ? 'Reviewed' : detail.action === 'REJECT' ? 'Discrepancy' : 'Pending',
                    reviewStatus: detail.action === 'ACCEPT' ? 'Reviewed' : 'Pending For Review',
                    date: 'today',
                    initials: (detail.vendor ?? 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
                    lineItems: detail.lineItems ?? 0,
                    assigneeId: 'me',
                }
                setExtraDocs(prev => [newDoc, ...prev])
            }
            setActiveTab('ack')
            setHighlightedAckId(detail.ackId)
            const t = setTimeout(() => setHighlightedAckId(null), 5000)
            return () => clearTimeout(t)
        }
        window.addEventListener('ack-vs-po:card-highlight', onHighlight)
        window.addEventListener('ack-vs-po:compare-committed', onCommitted)
        return () => {
            window.removeEventListener('ack-vs-po:card-highlight', onHighlight)
            window.removeEventListener('ack-vs-po:compare-committed', onCommitted)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const triggerToast = (title: string, description: string, type: 'success' | 'error' | 'info') =>
        addToast(type, `${title} · ${description}`)

    // ST-1169 · combined dataset · seed + cards net-new creadas por commits.
    const allDocs = useMemo(() => [...extraDocs, ...COMPARISON_DOCS], [extraDocs])

    const counts = useMemo(() => {
        const po = allDocs.filter(d => d.type === 'Purchase Order').length
        const ack = allDocs.filter(d => d.type === 'Acknowledgment').length
        return { po, ack } as Record<'po' | 'ack', number>
    }, [allDocs])

    const filtered = useMemo(() => allDocs.filter(d => {
        // DE1.18 · filtro por tipo (PO/ACK) en vez de status.
        const wantType: CompareDocType = activeTab === 'po' ? 'Purchase Order' : 'Acknowledgment'
        const matchesTab = d.type === wantType
        const q = query.trim().toLowerCase()
        const matchesSearch = !q || d.vendor.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || (d.relatedPo?.toLowerCase().includes(q) ?? false)
        return matchesTab && matchesSearch
    }), [activeTab, query, allDocs])

    // ST-1169 · Flow C · Diego 2026-09-11 · derived state para el hint "Pull PO from CORE".
    // Muestra el hint solo cuando el query parece un PO number Y no hay match local.
    const isPoPattern = PO_PATTERN.test(query.trim())
    const normalizedPo = normalizePo(query)
    const showPullHint = isPoPattern && filtered.length === 0

    // ST-1169 · Flow C · Diego 2026-09-11 · handler para el pull-from-CORE click.
    // Reverse lookup en COMPARISON_DOCS_ALL para encontrar el ACK relacionado
    // (si existe en el mock). Si no, sintetiza uno con timestamp.
    // Dispatcha `ack-vs-po:start-compare` (mismo event que Flow A) · reusa
    // el processing modal + ComparisonReviewModal sin cambios.
    const handlePullFromCore = () => {
        const matchingPo = COMPARISON_DOCS_ALL.find(
            d => d.type === 'Purchase Order' && d.id.toUpperCase() === normalizedPo
        )
        const ackId = matchingPo?.relatedPo ?? `ACK-LOOKUP-${Date.now()}`
        const vendor = matchingPo?.vendor ?? 'Unknown vendor'
        window.dispatchEvent(new CustomEvent('ack-vs-po:start-compare', {
            detail: { poNumber: normalizedPo, ackId, vendor, source: 'search-lookup' },
        }))
        setQuery('')
    }

    const openCompare = (d: ComparisonDoc) => setCompareDoc(d)
    const openResolve = (d: ComparisonDoc) => setResolveDoc({ id: d.id, name: d.id, vendor: d.vendor, inconsistencyCount: 3 })

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            {!hideNavbar && (
                <Navbar onLogout={onLogout} activeTab="Comparisons" onNavigateToWorkspace={() => onNavigate('comparisons')} onNavigate={onNavigate} leftSlot={navbarSwitcher ? <InlineExperienceSwitcher /> : undefined} hiddenTabs={navbarHiddenTabs} tabBadges={navbarTabBadges} />
            )}

            {/* DE1.7 · Diego 2026-09-02 · breadcrumb debajo del navbar (alineado con gostrata.app premain).
                ST-1169 Fase 1 fix · Diego 2026-09-09 · cuando hideNavbar,
                el consumer maneja su propio spacing → usar pt-4 en vez de
                pt-24 (que reserva el Navbar fixed interno). */}
            <div className={`${hideNavbar ? 'pt-4' : 'pt-24'} px-4 max-w-screen-2xl mx-auto`}>
                <div className="text-xs">
                    <Breadcrumbs items={[
                        { label: 'Expert Hub', onClick: () => onNavigate('ocr-tracking') },
                        { label: 'Comparisons', active: true },
                    ]} />
                </div>
            </div>

            <div className="pt-4 px-4 max-w-screen-2xl mx-auto space-y-6">
                {/* ST-1169 Fase 1.A (relocated) · Diego 2026-09-09 · slot
                    para banner de notif · vive arriba del comparisons card. */}
                {notifBanner}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Header: title + funnel + search + view toggle */}
                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* DE1.26 · Diego 2026-09-03 · icono GitCompare removido del
                                    title · violaba la regla DS de "brand color solo como
                                    background, nunca como texto/icono" y no era legible.
                                    Match prod (gostrata.app premain) que no muestra icono. */}
                                <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">
                                    Comparisons
                                </h3>
                                <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                                    {FUNNEL.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 outline-none whitespace-nowrap ${
                                                activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                                            }`}
                                        >
                                            {tab.label}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'}`}>
                                                {counts[tab.id] ?? 0}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                {/* ST-1169 · Flow C · wrapper para stackear el "Pull from CORE" hint
                                    debajo del search input cuando el user pastea un PO number. */}
                                <div className="flex-1 max-w-sm min-w-[220px] flex flex-col gap-1.5">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder="Search or paste PO number…"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                    </div>
                                    {showPullHint && (
                                        <button
                                            type="button"
                                            onClick={handlePullFromCore}
                                            title={`Pull ${normalizedPo} from Officeworks CORE and open compare`}
                                            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold px-2 py-1 rounded-md bg-primary/15 text-foreground hover:bg-primary/25 border border-primary/40 transition-colors"
                                        >
                                            <Cloud className="h-3.5 w-3.5 text-foreground" />
                                            Pull {normalizedPo} from Officeworks CORE →
                                        </button>
                                    )}
                                </div>
                                {/* ST-1169 Fase 1.B (integrado) · Diego 2026-09-09 ·
                                    slot para el intake Flow B (dropzone/botón),
                                    a la izquierda del view toggle. */}
                                {intakeSlot && (
                                    <div className="ml-auto flex items-center">
                                        {intakeSlot}
                                    </div>
                                )}
                                <div className={`${intakeSlot ? '' : 'ml-auto'} flex items-center border border-border rounded-lg overflow-hidden`}>
                                    <button onClick={() => setViewMode('list')} title="List view" aria-label="List view" className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setViewMode('grid')} title="Grid view" aria-label="Grid view" className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <GitCompare className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No comparisons</p>
                                <p className="text-sm text-muted-foreground mt-1">Acknowledgments paired with a purchase order appear here for review.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            // DE1.18 · Diego 2026-09-02 · rediseño de grid al layout
                            // OCR-style vía <ComparisonDocCard>. Antes tenía botón
                            // grande central "Compare with PO", chip status pill y
                            // sub-iconos reconcile/discrepancy · match visual con
                            // OcrDocCard + 1 icono compare adicional per Diego.
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {filtered.map(d => {
                                    const isHighlighted = highlightedAckId === d.id
                                    return (
                                        <div
                                            key={d.id}
                                            // ST-1169 · Diego 2026-09-09 · ring lime + subtle
                                            // scale/glow para reconocer la card recién comparada
                                            // via notif Action Center (auto-clear 5s).
                                            className={isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl transition-all animate-in fade-in zoom-in-95 duration-300' : 'transition-all'}
                                            ref={isHighlighted ? (el) => { el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } : undefined}
                                        >
                                            <ComparisonDocCard
                                                doc={d}
                                                onCompare={() => openCompare(d)}
                                                onPreview={() => addToast('info', `Preview ${d.id} (stub)`)}
                                                onDelete={() => addToast('info', `Delete ${d.id} (stub)`)}
                                                onSend={() => addToast('info', `Send ${d.id} (stub)`)}
                                                // DE1.19 · Diego 2026-09-03 · Compare solo en cards ACK
                                                // (por ahora no en PO · el flujo se dispara desde ACK).
                                                showCompare={d.type === 'Acknowledgment'}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            /* ── List (table) ── */
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30 text-left">
                                            {/* DE1.21 · Diego 2026-09-03 · revert DE1.20 · columna Brand
                                                eliminada · el avatar vuelve al cell Actions (como en
                                                prod) · representa el reviewer asignado (persona), no
                                                la marca del vendor. Sin título de columna. */}
                                            {['Document', 'Vendor', 'Linked PO', 'Status', 'Review Status', 'Date', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(d => (
                                            <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <div>
                                                            <div className="text-sm font-bold text-foreground font-mono">{d.id}</div>
                                                            <div className="text-[11px] text-muted-foreground">{d.lineItems} line items</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold text-foreground">{d.vendor}</div>
                                                    {/* DE1.18 · chip usa d.type (antes hardcoded 'Acknowledgment'). */}
                                                    <div className="mt-1"><DocTypeChip type={d.type} size="sm" /></div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-foreground">{d.relatedPo}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses(d.status)}`}>{d.status}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {d.reviewStatus === 'Reviewed' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> Reviewed</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Pending For Review</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{d.date}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {/* DE1.23 · Diego 2026-09-03 · flex + justify-between separa el
                                                        grupo de iconos de acción (izquierda) del avatar del reviewer
                                                        (derecha) · así el avatar queda siempre alineado al edge del
                                                        cell independientemente del número de acciones que la fila
                                                        tenga (ej. warning solo si Discrepancy). Antes la columna se
                                                        desalineaba porque el avatar iba pegado a los iconos. */}
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {/* DE1.19 · Compare solo en filas ACK (flujo se dispara desde ACK).
                                                                DE1.22 · texto "Compare" removido · queda solo el icon-button.
                                                                DE1.24 · Diego 2026-09-03 · color brand-lime (DS · brand-300/500)
                                                                para diferenciarlo del resto de acciones · es la acción "hero"
                                                                de la sección Comparisons. */}
                                                            {d.type === 'Acknowledgment' && (
                                                                <button
                                                                    onClick={() => openCompare(d)}
                                                                    title="Compare with PO"
                                                                    aria-label="Compare with PO"
                                                                    className="p-1.5 rounded-md bg-brand-300/30 text-foreground border border-brand-300/50 hover:bg-brand-300/50 dark:bg-brand-500/15 dark:border-brand-500/40 dark:hover:bg-brand-500/25 transition-colors"
                                                                >
                                                                    <GitCompare className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            {/* ST-1169 Fase 1.D · Diego 2026-09-09 · legacy triggers
                                                                gated · Reconcile + Resolve modales compiten con el
                                                                flujo canónico del ACK vs PO. */}
                                                            {!disableLegacyModals && (
                                                                <>
                                                                    <button onClick={() => setIsReconciliationOpen(true)} title="Reconcile PO vs ACK" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                                        <FileSearch className="h-4 w-4" />
                                                                    </button>
                                                                    {d.status === 'Discrepancy' && (
                                                                        <button onClick={() => openResolve(d)} title="Resolve discrepancies" className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors">
                                                                            <AlertTriangle className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {/* DE1.21 · avatar reviewer · match prod. Reusa TEAM_MEMBERS · fallback 'me'. */}
                                                        {(() => {
                                                            const reviewer = getTeamMember(d.assigneeId ?? CURRENT_USER_ID) ?? getTeamMember(CURRENT_USER_ID)!
                                                            return (
                                                                <div
                                                                    title={`Assigned to ${reviewer.name}`}
                                                                    className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarGradient(reviewer.id)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                                                                >
                                                                    {reviewer.initials}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PO↔ACK comparison flow */}
            <ComparisonLauncher
                isOpen={!!compareDoc}
                onClose={() => setCompareDoc(null)}
                poNumber={compareDoc?.relatedPo ?? ''}
                ackId={compareDoc?.id ?? ''}
                onDecision={(report, action) => {
                    const t = action === 'REJECT' ? 'error' : action === 'REQUEST_REVIEW' ? 'info' : 'success'
                    const verb = action === 'ACCEPT' ? 'accepted' : action === 'REJECT' ? 'rejected' : 'flagged for review'
                    addToast(t, `${report.po_number} vs ${report.ack_id} ${verb} (simulated)`)
                }}
            />

            {/* ST-1169 Fase 1.D · Diego 2026-09-09 · legacy modales gated ·
                cuando el consumer pasa disableLegacyModals=true no se
                montan, evitando que compitan con el flujo canónico. */}
            {!disableLegacyModals && (
                <>
                    <AckReconciliationModal isOpen={isReconciliationOpen} onClose={() => setIsReconciliationOpen(false)} triggerToast={triggerToast} />
                    <ResolveInconsistencyModal isOpen={!!resolveDoc} onClose={() => setResolveDoc(null)} document={resolveDoc} />
                </>
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    )
}
