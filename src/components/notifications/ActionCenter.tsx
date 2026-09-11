import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { BellIcon, MagnifyingGlassIcon, XMarkIcon, Squares2X2Icon, ExclamationTriangleIcon, CreditCardIcon, ClipboardDocumentCheckIcon, TruckIcon, DocumentTextIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { mockNotifications } from './data';
import FilterTabs from './FilterTabs';
import NotificationItem from './NotificationItem';
import type { Notification, NotificationTab } from './types';
import { useDemo } from '../../context/DemoContext';
import { useDemoProfile } from '../../context/useDemoProfile';
import { usePauseAware } from '../../context/usePauseAware';

// Flow 2 notifications for Step 2.6
const FLOW2_NOTIFICATIONS: Notification[] = [
    // ORD-2056 · Delayed shipment scenario (Kenya feedback 2026-06-04) — pinned at top as high priority unread.
    {
        id: 'shipment-delayed-ord-2056', type: 'shipment', priority: 'high',
        title: 'Shipment Delayed — ORD-2056',
        message: 'Carrier weather hold on I-80 · +8d delay. New ETA Mar 28 (was Mar 20). Dealer notification recommended · 24hr call-before-delivery required.',
        meta: 'CarrierTrackingAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View Order', primary: true }, { label: 'Notify Dealer', primary: false }], persona: 'dealer',
    },
    {
        id: 'f2-hat-confirmed', type: 'ack_received', priority: 'low',
        title: 'Acknowledgement-7841 (HAT) — Confirmed',
        message: '5 lines confirmed. AI vendor rule applied: part number match is sufficient per client directive.',
        meta: 'ACKIngestionAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View Acknowledgement', primary: true }], persona: 'dealer',
    },
    {
        id: 'f2-ais-resolved', type: 'ack_received', priority: 'high',
        title: 'Acknowledgement-7842 (AIS) — 3 Exceptions Resolved',
        message: '50 lines processed. Grommet corrected (Line 41), dates accepted (+14/+11 days), backorder BO-1064B created for 6 units.',
        meta: 'DiscrepResolverAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View Details', primary: true }], persona: 'dealer',
    },
    {
        id: 'f2-expert-queue', type: 'system', priority: 'medium',
        title: 'Expert Queue Update',
        message: 'Acknowledgement-7842 grommet auto-corrected (Line 41, X-DS6030 CB). Next queue: 2 pending Acknowledgements.',
        meta: 'NotificationAgent', timestamp: '2 min ago', unread: true,
        actions: [{ label: 'View Queue', primary: true }], persona: 'expert',
    },
    {
        id: 'f2-crm-sync', type: 'system', priority: 'medium',
        title: 'CRM Order Lifecycle — Ready to Sync',
        message: 'ACK-7841 and ACK-7842 fully processed. Delivery dates, backorder status, and resolution data ready to sync to Premier Underground Design project timeline.',
        meta: 'OrderSyncAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'Sync to CRM', primary: true }], persona: 'dealer',
    },
];

// Flow 3 · Sample & Textile — email-style notifications (Wendy items 9 & 10)
const SAMPLE_REQUEST_NOTIF: Notification = {
    id: 'st-sample-request', type: 'approval', priority: 'high',
    title: 'Sample request · QT-1025',
    message: 'NorthPoint requested a CF Stinson "Ocean Blue" swatch for the LB Lounge (F-SSC346030C) before approving the quote. Textile grading + Excel approval pending validation.',
    meta: 'procurement@northpointfurniture.com',
    timestamp: 'Just now', unread: true,
    actions: [{ label: 'Review in quote', primary: true }], persona: 'dealer',
};
// Manufacturer reply after the dealer sends the request (round-trip).
const sampleResponseNotif = (tracking: string): Notification => ({
    id: 'st-sample-response', type: 'shipment', priority: 'high',
    title: 'Manufacturer responded · sample shipped',
    message: `Order entry approved the swatch request. CF Stinson kit shipped via FedEx · tracking ${tracking} · est. 3 business days. One swatch proposed as graded-equivalent (CF-6021 Navy) — review needed.`,
    meta: 'orders@strata-manufacturing.com',
    timestamp: 'Just now', unread: true,
    actions: [{ label: 'View response', primary: true }], persona: 'dealer',
});

// BFI steps generic incoming-event notifications
interface BfiStepNotif {
    badge: string
    badgeColor: 'ai' | 'warning' | 'success'
    title: string
    desc: string
    sender: string
    re?: string
    attachment?: string
    cta: string
    event: string
    footerText: string
}

const BFI_STEP_NOTIFICATIONS: Record<string, BfiStepNotif> = {
    'a1.2c': {
        badge: '1 new', badgeColor: 'success',
        title: 'PO Received · DOE-2847 ready for review',
        desc: 'Q-2026-0089 has been approved and converted to PO DOE-2847 ($235,560). Please review PO and labor figures before confirming and sending to CORE.',
        sender: 'nycdoe-procurement@schools.nyc.gov',
        re: 'Purchase Order DOE-2847 · NYC Dept. of Education · $235,560',
        attachment: 'DOE-2847-PurchaseOrder.pdf',
        cta: 'Review PO →',
        event: 'bfi:po-review-open',
        footerText: 'PO review pending',
    },
    'a1.2d': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Purchase Order confirmed · NYC Dept. of Education',
        desc: 'DOE-2847 · Q-2026-0089 · Delivery May 14–21 · 35 cartons · warehouse receiving',
        sender: 'NYC Dept. of Education · Procurement',
        cta: 'Review receiving documents →',
        event: 'bfi:wig-open',
        footerText: 'WIG receiving ready',
    },
    'a1.2e': {
        badge: '1 urgent', badgeColor: 'warning',
        title: 'Missing Carton · DOE-2847',
        desc: 'Carton #34 not received at WIG NJ — Monitor Arm Dual Adjustable. Receiving complete: 34/35 cartons.',
        sender: 'Receiving Coordinator Lynn · Receiving Coordinator',
        cta: 'Review & file claim →',
        event: 'bfi:claim-open',
        footerText: 'Awaiting claim',
    },
    'a1.2f': {
        badge: '1 new', badgeColor: 'success',
        title: 'Shortage claim resolved · Herman Miller',
        desc: 'Monitor Arm Dual Adjustable · Replacement carton ETA May 18 · Cleared for work order scheduling.',
        sender: 'Herman Miller · Customer Service',
        cta: 'Review & notify →',
        event: 'bfi:resolved-open',
        footerText: 'Work order ready',
    },
    'a1.3b': {
        badge: '1 new', badgeColor: 'ai',
        title: 'CPR approved · Final quote ready · DOE-2847',
        desc: 'Account Manager DeMar completed CPR reconciliation — Carpenters −5h, OT −2h · Total −$2,340 · Pending: send final quote to Herman Miller.',
        sender: 'Account Manager DeMar · Account Manager',
        cta: 'Review & send quote to Nancy →',
        event: 'bfi:michael-open',
        footerText: 'Quote pending',
    },
    'a1.3c': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Final Labor Quote ready · DOE-2847 · Invoice upload requested',
        desc: 'CPR-adjusted quote ($6,920) has been approved. Please upload the Quote Tool approved invoice to complete the fee verification process.',
        sender: 'Manager Boyle · Director of Strategic Accounts',
        cta: 'Upload invoice →',
        event: 'bfi:invoice-open',
        footerText: 'Invoice upload pending',
    },
    'a1.4': {
        badge: '1 new', badgeColor: 'success',
        title: 'Quote Tool invoice forwarded · DOE-2847 · Fee verification requested',
        desc: 'The Quote Tool approved invoice ($6,920) for Purchase Order DOE-2847 is attached. CPR reconciliation is complete — please review and confirm the agency fee.',
        sender: 'Account Manager DeMar · Account Manager · BFI',
        cta: 'Review fee →',
        event: 'bfi:fee-open',
        footerText: 'Fee verification pending',
    },
}

// BFI Step a1.1 — Miller Knoll quote request notification
const BFI_A11_NOTIFICATIONS: Notification[] = [
    {
        id: 'bfi-a11-miller-knoll',
        type: 'quote_update',
        priority: 'high',
        title: 'New quote request · Miller Knoll',
        message: 'Account Manager Bly sent SIF + PDF specs for DOE-2847 · NYC Dept. of Education · Q-2026-0089',
        meta: 'robert.chen@millerknoll.com · May 6 · 8:14 AM',
        timestamp: 'May 6 · 8:14 AM',
        unread: true,
        actions: [{ label: 'Ingest with Strata', primary: true }],
    },
];

// Flow 1 notification for Step 1.10 — single focused notification
const FLOW1_NOTIFICATIONS: Notification[] = [
    {
        id: 'f1-po', type: 'po_created', priority: 'high',
        title: 'PO Created from RFQ',
        message: 'Order #PO-1029 generated for Home Exteriors — $134,250. Quote QT-1025 approved (2/2). Ready for pipeline.',
        meta: 'POBuilderAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View PO', primary: true }], persona: 'dealer',
    },
];

// Dupler Step d1.1 — Non-CET manufacturer detected · surfaces in the Action
// Center bell popover so the Vendor Data flow uses the DS-canonical alert
// pattern instead of a big inline banner (Diego 2026-07-21).
const DUPLER_D11_NOTIFICATION: Notification = {
    id: 'dupler-d11-non-cet',
    type: 'discrepancy',
    priority: 'high',
    title: 'Non-CET Manufacturer Detected · Meridian Workspace',
    message: 'Meridian Workspace is not available in the CET catalog. Product data (part numbers, options, pricing) needs to be imported from an external source. Missing in CET · No SIF available.',
    meta: 'CatalogGuardAgent · detected during PDF ingest',
    timestamp: 'Just now',
    unread: true,
    actions: [
        { label: 'Import vendor data', primary: true },
        { label: 'Dismiss', primary: false },
    ],
};

// F44.b.4 (Diego 2026-07-29) · COI (Dealer Sage) Flow 1 milestones · surface
// las eventos claves del Email → PO → CRM en el Action Center bell para
// consistencia con Strata pattern. Diego reportó que la CRM Dashboard ya
// mostraba "New Project Auto-Created" banner (step 1.12) pero no aparecía
// en el bell del navbar · rompía la promesa "todas las notifs centralizadas".
// Reemplaza banners inline por notifs en el Action Center · sigue el mismo
// pattern que Continua/Workspaces (sin gate isDemoActive · dispara por
// currentStep.id · guard por profile.id para no cross-firing).
const COI_STEP_NOTIFICATIONS: Record<string, Notification> = {
    '1.1': {
        id: 'coi-1.1-rfq-received',
        type: 'system',
        priority: 'high',
        title: 'RFQ Detected · Apex Furniture',
        message: '200 Executive Task Chairs · Specs.pdf + OrderData.csv attached · auto-processing initiated.',
        meta: 'EmailIntakeAgent · orders@apexfurniture.com',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View RFQ', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.2': {
        id: 'coi-1.2-extraction-complete',
        type: 'system',
        priority: 'medium',
        title: 'AI Extraction Complete · 200 line items',
        message: 'OCR + DataParser extracted 200 items across 4 delivery zones · 82% overall confidence · normalizing to SIF format.',
        meta: 'DataParser + Normalizer · Strata AI Engine v2.0',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View extraction', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.5': {
        id: 'coi-1.5-expert-review',
        type: 'approval',
        priority: 'high',
        title: 'Expert Review Complete · QT-1025',
        message: '200 items validated by Dr. James Wilson · 7 spec issues resolved · 96.5% pass rate · $22,750 savings · approval chain initiated.',
        meta: 'SpecValidationAgent · Expert Hub',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review quote', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.6': {
        id: 'coi-1.6-approval-chain',
        type: 'approval',
        priority: 'high',
        title: 'Quote Approval Chain Initiated · QT-1025',
        message: 'Quote QT-1025 ($134,250) triggered 2-level workflow · System Policy Engine (Level 1) reviewing · Regional Sales Manager Reyes (Level 2) pending.',
        meta: 'ApprovalOrchestratorAgent · Policy Match 94%',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View chain', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.7': {
        id: 'coi-1.7-manager-approved',
        type: 'approval',
        priority: 'high',
        title: 'Quote Ready for Review · QT-1025',
        message: 'Quote QT-1025 for Apex Furniture — $134,250, 5 SKUs · AI-generated from RFQ · ready for your approval.',
        meta: 'Regional Sales Manager Reyes · Sara\'s dashboard',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Approve quote', primary: true },
            { label: 'Request changes', primary: false },
        ],
    },
    '1.9': {
        id: 'coi-1.9-po-generated',
        type: 'po_created',
        priority: 'high',
        title: 'PO Auto-Generated · ORD-2055',
        message: 'PO ORD-2055 for Apex Furniture — $43,750, 200 items across 4 delivery zones. 3-level approval chain complete · transmitted to supplier · zero re-entry.',
        meta: 'POGenerationAgent + ApprovalOrchestratorAgent',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View PO', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.11': {
        id: 'coi-1.11-pipeline-order',
        type: 'system',
        priority: 'medium',
        title: 'New Order in Pipeline · ORD-2055',
        message: 'Order ORD-2055 (Apex Furniture · $43,750) entered production pipeline · animated column transition · notifications ready.',
        meta: 'PipelineAgent · Expert Hub Transactions',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View pipeline', primary: true },
            { label: 'Send notifications', primary: false },
        ],
    },
    '1.12': {
        id: 'coi-1.12-crm-project-created',
        type: 'system',
        priority: 'medium',
        title: 'New Project Auto-Created · Apex HQ Renovation',
        message: 'ProjectCreationAgent created PRJ-001 from Quote QT-1025 · $43,750 · 200 line items · 4 delivery zones · 5 suppliers · zero manual CRM entry.',
        meta: 'ProjectCreationAgent · Cross-platform sync active',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View project', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.13': {
        id: 'coi-1.13-customer-360',
        type: 'system',
        priority: 'low',
        title: 'Customer 360 Updated · Apex Furniture',
        message: 'Apex Furniture profile aggregated across systems · $1.2M lifetime value · 5 active projects · 200 items delivery in progress.',
        meta: 'CustomerAggregatorAgent · CRM',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View 360', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
};

// F42.a Task A · Continua (Project & Inventory Intelligence) notifications.
// Reemplaza 11 banners custom inline en Inventory.tsx · Transactions.tsx ·
// Dashboard.tsx por notifs registradas en el Action Center · pattern análogo
// a Dupler d1.1 y Workspaces post-F41.a hotfix (sin gate isDemoActive · dispara
// por currentStep.id). Content extraído literal de los banners originales.
// Steps duplicados (3.2 ack · 1.5 txn) preservan sus banners inline por ahora ·
// F42.b/c/d puede migrarlos si Diego lo pide.
const CONTINUA_STEP_NOTIFICATIONS: Record<string, Notification> = {
    '1.1': {
        id: 'continua-1.1-inventory-health',
        type: 'system',
        priority: 'high',
        title: 'Inventory Health Analysis · Capacity Alert',
        message: '2,400 items across 3 warehouses — Chicago warehouse forecast to reach 85% capacity in 2 weeks.',
        meta: 'InventoryIntelAgent · detected during nightly scan',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review analysis', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.2': {
        id: 'continua-1.2-reuse',
        type: 'system',
        priority: 'medium',
        title: 'Reuse Assessment — Floor 7 Teardown',
        message: '340 items from floor 7 pre-renovation teardown — classifying reuse, recycle, EOL.',
        meta: 'SustainabilityAgent · 340 items ready for assessment',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start assessment', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.4': {
        id: 'continua-1.4-location-sync',
        type: 'system',
        priority: 'medium',
        title: 'Multi-Location Sync · 5 locations',
        message: 'Synchronizing 3 warehouses + 2 job sites — tracking in-transit items, pending QC, optimizing delivery routes.',
        meta: 'LocationSyncAgent · continuous sync',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start sync', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '1.5': {
        id: 'continua-1.5-consignment',
        type: 'system',
        priority: 'high',
        title: 'Consignment Review — 90-Day Window',
        message: '12 items approaching 90-day return window. 8 high-value chairs ($24K) need decision this week.',
        meta: 'ConsignmentAgent · decisions needed this week',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review decisions', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '2.4': {
        id: 'continua-2.4-relocation',
        type: 'announcement',
        priority: 'medium',
        title: 'Quick Action — Office Relocation',
        message: "Carlos's chair is being replaced. Relocate his workstation assets from Office 3-214 → Office 3-216 (vacant).",
        meta: 'Facilities · temporary relocation',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start relocation', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '3.2': {
        id: 'continua-3.2-procurement',
        type: 'approval',
        priority: 'high',
        title: 'PO Package Generation — Corporate HQ Project',
        message: '1,500 line items across 12 manufacturers · 4 price sources · 5 business rules · 3 consolidated POs ($3.2M).',
        meta: 'ProcurementAgent · Corporate HQ Phase 2',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review procurement', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '3.3': {
        id: 'continua-3.3-conversion',
        type: 'approval',
        priority: 'medium',
        title: 'Quick Action — PO to ACK Conversion',
        message: 'Review conversion checklist: contract compliance, quantities, delivery schedule, price verification before converting PO package ($3.2M) to Acknowledgement.',
        meta: 'ConversionAgent · ready for review',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start conversion review', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '3.4': {
        id: 'continua-3.4-approval-chain',
        type: 'approval',
        priority: 'high',
        title: 'Approval Chain — PO to ACK Conversion',
        message: 'Sequential 3-level approval required: AI Compliance Agent, Expert Regional Sales Manager, Dealer Account Manager Kai. Total $3.2M conversion.',
        meta: 'ApprovalEngine · 3-level chain',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start approval chain', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '3.5': {
        id: 'continua-3.5-receiving',
        type: 'system',
        priority: 'medium',
        title: 'Shipment Receiving Initiated · 3 shipments',
        message: 'Processing 3 incoming shipments at Chicago warehouse — QR scan, PO matching, QC inspection.',
        meta: 'ReceivingAgent · Chicago warehouse',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Start receiving', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    '4.1': {
        id: 'continua-4.1-sustainability',
        type: 'announcement',
        priority: 'medium',
        title: 'Sustainability Impact Report · UAL Project',
        message: '194 tons diverted from landfill · 78% carbon reduction · 2,000 items refurbished.',
        meta: 'SustainabilityMetricsAgent · UAL Project',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View metrics', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
};

// ST-1169 · Diego 2026-09-09 · ACK vs PO · Flow A trigger.
// Notif de Action Center · trigger del auto-pull cuando un vendor envía un
// nuevo ACK que matchea con un PO existente. Diseño minimalista (mandate
// del plan): 1 fila · 1 sola acción "Compare with PO" (verb + object per
// DS rules 14-microcopy) · sin adornos decorativos.
// El handler en onActionClick dispara un CustomEvent que el AckVsPoApp
// escucha para arrancar el staging view (Fase 2.B).
const ACK_VS_PO_NOTIFICATION: Notification = {
    id: 'ack-vs-po-new-ack',
    type: 'ack_received',
    priority: 'high',
    title: 'New ACK · PO-2026-1042 · Herman Miller',
    message: 'Vendor sent acknowledgement · 118 line items · ready to auto-compare.',
    meta: 'AckIntakeAgent · via EDI · 2 min ago',
    timestamp: '2 min ago',
    unread: true,
    actions: [
        { label: 'Compare with PO', primary: true },
    ],
    persona: 'dealer',
};

// F41.a Task B · Workspaces expense management notifications (desktop steps).
// Reemplaza 3 banners custom "STRATA · ACTION REQUIRED" inline en las scenes
// (ApprovalQueueScene · APReviewQueueScene · CFODashboardScene) por notifs
// registradas en el Action Center · pattern análogo a Dupler d1.1 y BFI.
// w1.4 (mobile Alpha status) queda con toast local · el bell no está
// disponible en workspaces-submit app (App.tsx L721 · Navbar hidden).
const WORKSPACES_STEP_NOTIFICATIONS: Record<string, Notification> = {
    'w1.2': {
        id: 'workspaces-w1.2-submit',
        type: 'approval',
        priority: 'high',
        title: 'Employee Alpha submitted a $95.00 expense',
        message: 'Mileage · Tolls / Cab / Parking · May 5 · 1 receipt attached inline',
        meta: 'ExpenseAgent · flagged for review',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review expense', primary: true },
            { label: 'Dismiss', primary: false },
        ],
    },
    'w2.1': {
        id: 'workspaces-w2.1-ap-ready',
        type: 'approval',
        priority: 'medium',
        title: 'AP Queue ready · $95.00 pending post to CORE',
        message: 'Employee Alpha · Mileage · manager Sarah approved · ready for GL sync',
        meta: 'GLSyncAgent · auto-classified',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'Review GL', primary: true },
            { label: 'Flag for review', primary: false },
        ],
    },
    'w2.4': {
        id: 'workspaces-w2.4-cycle',
        type: 'announcement',
        priority: 'medium',
        title: 'Monthly expense cycle complete',
        message: '23 expenses posted · 1 rule improved · Parking approval rate 72% → 97%',
        meta: 'CFODashboardAgent · May cycle',
        timestamp: 'Just now',
        unread: true,
        actions: [
            { label: 'View May dashboard', primary: true },
        ],
    },
};

interface ActionCenterProps {
    /** When true (shared-block preview) programmatically opens the popover
     *  on mount so viewers see the full panel content immediately instead
     *  of just the bell icon. */
    defaultOpen?: boolean;
}

export default function ActionCenter({ defaultOpen = false }: ActionCenterProps = {}) {
    const { isDemoActive, isSidebarCollapsed, currentStep, nextStep } = useDemo();
    const { activeProfile } = useDemoProfile();
    const { pauseAwareTimeout } = usePauseAware();
    const sidebarExpanded = isDemoActive && !isSidebarCollapsed;
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // BFI Step a1.1: Auto-open with Miller Knoll quote request
    const isStepA11 = isDemoActive && currentStep?.id === 'a1.1';
    const [a11PanelClosed,  setA11PanelClosed]  = useState(false);
    const [a11IngestState,  setA11IngestState]  = useState<'idle' | 'ingesting' | 'ready'>('idle');
    const [a11IngestCount,  setA11IngestCount]  = useState(0);
    // BFI generic step panel (a1.2d / a1.2e / a1.2f / a1.3b)
    const [bfiPanelClosed, setBfiPanelClosed] = useState(false);
    // Delay before any BFI notification panel appears (2s after step loads)
    const [notifDelayReady, setNotifDelayReady] = useState(false);
    // Reset all BFI panels when step changes, then reveal after 2s (pause-aware)
    useEffect(() => {
        setA11PanelClosed(false);
        setA11IngestState('idle');
        setA11IngestCount(0);
        setBfiPanelClosed(false);
        setNotifDelayReady(false);
        const cancel = pauseAwareTimeout(() => setNotifDelayReady(true), 2000);
        return () => cancel?.();
    }, [currentStep?.id, pauseAwareTimeout]);

    // Step 1.10: Auto-open with single notification
    const isStep19 = isDemoActive && currentStep?.id === '1.10';

    // Step 2.7: Auto-open with animated delivery for Flow 2 Acknowledgement notifications
    const isStep27 = isDemoActive && currentStep?.id === '2.7';
    const [notifDelivered27, setNotifDelivered27] = useState<number[]>([]);

    useEffect(() => {
        if (!isStep27) { setNotifDelivered27([]); return; }
        const cancels = [
            pauseAwareTimeout(() => setNotifDelivered27([0]),          1500),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1]),       3000),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1, 2]),    4500),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1, 2, 3]),6000),
        ];
        return () => cancels.forEach(c => c?.());
    }, [isStep27, pauseAwareTimeout]);

    // Flow 3 · Sample & Textile — event-driven panel (arrives on entering QT-1025)
    const [sampleTextileActive, setSampleTextileActive] = useState(false);
    const [samplePhase, setSamplePhase] = useState<'request' | 'response'>('request');
    const [sampleTracking, setSampleTracking] = useState<string | null>(null);
    useEffect(() => {
        // Initial: dealer's sample request "arrives" on entering the quote.
        const onArrive = () => { setSamplePhase('request'); setSampleTextileActive(true); };
        // Round-trip: after the dealer sends, the manufacturer reply arrives ~2.5s later.
        const onSent = (e: Event) => {
            const tracking = (e as CustomEvent).detail?.tracking ?? 'SMP-2026';
            setSampleTracking(tracking);
            setTimeout(() => { setSamplePhase('response'); setSampleTextileActive(true); }, 2500);
        };
        window.addEventListener('sample-textile:arrive', onArrive);
        window.addEventListener('sample-textile:sent', onSent);
        return () => {
            window.removeEventListener('sample-textile:arrive', onArrive);
            window.removeEventListener('sample-textile:sent', onSent);
        };
    }, []);
    // Auto-dismiss the panel after a max of 3s on screen (per user · was 9s).
    useEffect(() => {
        if (!sampleTextileActive) return;
        const t = setTimeout(() => setSampleTextileActive(false), 3000);
        return () => clearTimeout(t);
    }, [sampleTextileActive, samplePhase, sampleTracking]);

    const tabs: NotificationTab[] = [
        {
            id: 'all', label: 'All',
            count: mockNotifications.filter(n => n.unread).length,
            icon: Squares2X2Icon,
            colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-foreground', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-muted0/20 dark:bg-white/20', badgeText: 'text-foreground' },
            filter: () => true
        },
        {
            id: 'discrepancy', label: 'Discrepancies',
            count: mockNotifications.filter(n => n.type === 'discrepancy' && n.unread).length,
            icon: ExclamationTriangleIcon,
            colorTheme: { activeBg: 'bg-destructive/15', activeText: 'text-destructive', activeBorder: 'border-destructive/30', badgeBg: 'bg-destructive/20', badgeText: 'text-destructive' },
            filter: (n) => n.type === 'discrepancy'
        },
        {
            id: 'quotes', label: 'Quotes & POs',
            count: mockNotifications.filter(n => (n.type === 'quote_update' || n.type === 'po_created' || n.type === 'ack_received' || n.type === 'approval') && n.unread).length,
            icon: DocumentTextIcon,
            colorTheme: { activeBg: 'bg-info/15', activeText: 'text-info', activeBorder: 'border-info/30', badgeBg: 'bg-info/20', badgeText: 'text-info' },
            filter: (n) => n.type === 'quote_update' || n.type === 'po_created' || n.type === 'ack_received' || n.type === 'approval'
        },
        {
            id: 'pricing', label: 'Pricing',
            count: mockNotifications.filter(n => (n.type === 'payment' || n.type === 'invoice') && n.unread).length,
            icon: CreditCardIcon,
            colorTheme: { activeBg: 'bg-warning/15', activeText: 'text-warning', activeBorder: 'border-warning/30', badgeBg: 'bg-warning/20', badgeText: 'text-warning' },
            filter: (n) => n.type === 'payment' || n.type === 'invoice'
        },
        {
            id: 'shipping', label: 'Shipping',
            count: mockNotifications.filter(n => (n.type === 'shipment' || n.type === 'backorder') && n.unread).length,
            icon: TruckIcon,
            colorTheme: { activeBg: 'bg-success/15', activeText: 'text-success', activeBorder: 'border-success/30', badgeBg: 'bg-success/20', badgeText: 'text-success' },
            filter: (n) => n.type === 'shipment' || n.type === 'backorder'
        },
    ];

    // Dupler d1.1 · surface the Non-CET notification at the top of the list
    // so the Vendor Data flow uses the DS Action Center instead of an inline
    // banner. Visibility is driven by DuplerPdfProcessor's scrapePhase (the
    // source of truth for the flow) via `dupler:non-cet-show` /
    // `dupler:non-cet-hide` custom events · this way once the user Imports,
    // Dismisses, or advances the flow, the notification stays hidden even
    // if they come back to step d1.1 later.
    const [shouldShowDuplerD11, setShouldShowDuplerD11] = useState(false);
    useEffect(() => {
        const show = () => setShouldShowDuplerD11(true);
        const hide = () => setShouldShowDuplerD11(false);
        window.addEventListener('dupler:non-cet-show', show);
        window.addEventListener('dupler:non-cet-hide', hide);
        return () => {
            window.removeEventListener('dupler:non-cet-show', show);
            window.removeEventListener('dupler:non-cet-hide', hide);
        };
    }, []);

    // F41.a Task B · Workspaces step notification · gated ÚNICAMENTE por
    // currentStep.id (sin gate isDemoActive · pattern análogo a Dupler d1.1
    // que se dispara por scrapePhase sin depender del tour). Esto garantiza
    // que en modo normal (sin Start Demo) el user vea la notif al aterrizar
    // en w1.2/w2.1/w2.4. El registry mantiene 3 entries desktop. w1.4 mobile
    // sigue con toast local · bell hidden en workspaces-submit app.
    // F41.a hotfix · Diego reportó que la notif no aparecía en modo normal
    // porque isDemoActive era false al llegar al step sin Start Demo.
    const workspacesStepConfig = WORKSPACES_STEP_NOTIFICATIONS[currentStep?.id ?? ''];
    const [workspacesDismissed, setWorkspacesDismissed] = useState<Set<string>>(new Set());
    const isWorkspacesActive = !!workspacesStepConfig && !workspacesDismissed.has(workspacesStepConfig.id);

    // F42.a Task A · Continua notification · mismo pattern que Workspaces
    // (sin gate isDemoActive · dispara por currentStep.id). Solo activo cuando
    // el profile activo es continua (guard adicional para evitar cross-firing
    // en otros profiles que pueden compartir step ids como '1.1' o '3.2').
    const isContinuaProfile = activeProfile?.id === 'continua';
    const continuaStepConfig = isContinuaProfile
        ? CONTINUA_STEP_NOTIFICATIONS[currentStep?.id ?? '']
        : undefined;
    const [continuaDismissed, setContinuaDismissed] = useState<Set<string>>(new Set());
    const isContinuaActive = !!continuaStepConfig && !continuaDismissed.has(continuaStepConfig.id);

    // F44.b.4 · COI (Dealer Sage) Flow 1 notifications · mismo pattern que
    // Continua · guardean por profile.id para no cross-firing con OPS o otros
    // profiles que tienen step ids 1.1-1.13 pero con contenido distinto.
    // F45.a · Extendido a acme (Dealer Rust) · comparte COI_STEPS 1.1-1.11.
    // Los entries 1.12/1.13 (CRM) son no-ops porque acme no tiene esos steps.
    const isCoiProfile = activeProfile?.id === 'coi' || activeProfile?.id === 'acme';
    const coiStepConfig = isCoiProfile
        ? COI_STEP_NOTIFICATIONS[currentStep?.id ?? '']
        : undefined;
    const [coiDismissed, setCoiDismissed] = useState<Set<string>>(new Set());
    const isCoiActive = !!coiStepConfig && !coiDismissed.has(coiStepConfig.id);

    // ST-1169 · Diego 2026-09-09 · ACK vs PO Flow A notification.
    // Guard por profile.id === 'ack-vs-po' para no cross-firing en otros
    // profiles. La notif no está gated por currentStep porque el profile
    // no tiene guided tour (steps: []); se muestra siempre que el user
    // esté en el profile ack-vs-po y no la haya dismisseado.
    const isAckVsPoProfile = activeProfile?.id === 'ack-vs-po';
    const [ackVsPoDismissed, setAckVsPoDismissed] = useState(false);
    const isAckVsPoActive = isAckVsPoProfile && !ackVsPoDismissed;

    const filteredNotifications = useMemo(() => {
        const currentTab = tabs.find(t => t.id === activeTab);
        const continuaEntry = isContinuaActive ? [continuaStepConfig!] : [];
        const workspacesEntry = isWorkspacesActive ? [workspacesStepConfig!] : [];
        const coiEntry = isCoiActive ? [coiStepConfig!] : [];
        const duplerEntry = shouldShowDuplerD11 ? [DUPLER_D11_NOTIFICATION] : [];
        // ST-1169 · Diego 2026-09-09 · ACK vs PO Flow A notification.
        const ackVsPoEntry = isAckVsPoActive ? [ACK_VS_PO_NOTIFICATION] : [];
        // F44.b.4 · Para COI, mostrar solo el step-specific + mockNotifications
        // relevantes (ej. shipment/PO). No mostrar entries de otros profiles.
        // ST-1169 · ACK vs PO va PRIMERO en el array para aparecer al top.
        const base = [...ackVsPoEntry, ...coiEntry, ...continuaEntry, ...workspacesEntry, ...duplerEntry, ...mockNotifications];
        return base
            .filter(n => currentTab?.filter(n))
            .filter(n =>
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.meta.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [activeTab, searchQuery, shouldShowDuplerD11, isWorkspacesActive, workspacesStepConfig, isContinuaActive, continuaStepConfig, isCoiActive, coiStepConfig, isAckVsPoActive]);

    const urgentCount = (shouldShowDuplerD11 ? 1 : 0)
        + (isWorkspacesActive && workspacesStepConfig?.priority === 'high' ? 1 : 0)
        + (isContinuaActive && continuaStepConfig?.priority === 'high' ? 1 : 0)
        + (isCoiActive && coiStepConfig?.priority === 'high' ? 1 : 0)
        + (isAckVsPoActive ? 1 : 0)  // ST-1169 · always high priority
        + mockNotifications.filter(n => n.priority === 'high').length;
    const totalCount = (shouldShowDuplerD11 ? 1 : 0)
        + (isWorkspacesActive ? 1 : 0)
        + (isContinuaActive ? 1 : 0)
        + (isCoiActive ? 1 : 0)
        + (isAckVsPoActive ? 1 : 0)  // ST-1169
        + mockNotifications.filter(n => n.unread).length;

    // Flow 1 tabs for step 1.10 — single tab since only 1 notification
    const flow1Tabs: NotificationTab[] = [
        { id: 'all', label: 'All', count: FLOW1_NOTIFICATIONS.length, icon: Squares2X2Icon, colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-foreground', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-muted0/20 dark:bg-white/20', badgeText: 'text-foreground' }, filter: () => true },
        { id: 'quotes', label: 'Quotes & POs', count: FLOW1_NOTIFICATIONS.length, icon: DocumentTextIcon, colorTheme: { activeBg: 'bg-info/15', activeText: 'text-info', activeBorder: 'border-info/30', badgeBg: 'bg-info/20', badgeText: 'text-info' }, filter: (n) => n.type === 'po_created' || n.type === 'quote_update' },
    ];

    // Flow 2 tabs for step 2.6
    const flow2Tabs: NotificationTab[] = [
        { id: 'all', label: 'All', count: FLOW2_NOTIFICATIONS.length, icon: Squares2X2Icon, colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-foreground', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-muted0/20 dark:bg-white/20', badgeText: 'text-foreground' }, filter: () => true },
        { id: 'acks', label: 'Acknowledgements', count: FLOW2_NOTIFICATIONS.filter(n => n.type === 'ack_received').length, icon: DocumentTextIcon, colorTheme: { activeBg: 'bg-info/15', activeText: 'text-info', activeBorder: 'border-info/30', badgeBg: 'bg-info/20', badgeText: 'text-info' }, filter: (n) => n.type === 'ack_received' },
        { id: 'system', label: 'System', count: FLOW2_NOTIFICATIONS.filter(n => n.type === 'system').length, icon: SparklesIcon, colorTheme: { activeBg: 'bg-success/15', activeText: 'text-success', activeBorder: 'border-emerald-500/20', badgeBg: 'bg-success/20', badgeText: 'text-success' }, filter: (n) => n.type === 'system' },
    ];

    const A11_INGEST_LINES = [
        { text: 'DOE-2847.sif parsed · 6 line items extracted', isWarning: false },
        { text: 'NYC-DOE-2847-specs.pdf parsed',                 isWarning: false },
        { text: 'Floor plan detected',                           isWarning: false },
    ];

    const handleA11Ingest = () => {
        setA11IngestState('ingesting');
        pauseAwareTimeout(() => setA11IngestCount(1), 600);
        pauseAwareTimeout(() => setA11IngestCount(2), 1200);
        pauseAwareTimeout(() => setA11IngestCount(3), 1800);
        pauseAwareTimeout(() => {
            setA11IngestState('ready');
            window.dispatchEvent(new CustomEvent('bfi:ingest'));
            pauseAwareTimeout(() => setA11PanelClosed(true), 800);
        }, 2300);
    };

    const bfiStepConfig = isDemoActive ? BFI_STEP_NOTIFICATIONS[currentStep?.id ?? ''] : undefined;
    const isBfiStepActive = !!bfiStepConfig && !bfiPanelClosed && notifDelayReady;

    const isStepAutoOpen = isStep19 || isStep27 || (isStepA11 && !a11PanelClosed && notifDelayReady) || isBfiStepActive;

    // Programmatic auto-open · captures the PopoverButton ref and triggers
    // a click on mount when defaultOpen is true (shared-block preview).
    const bellRef = useRef<HTMLButtonElement | null>(null);
    // F21 · sync the HeadlessUI Popover `open` state to a ref so the auto-open
    // useEffects can check the current visibility before firing a click (which
    // would otherwise TOGGLE-close an already-open popover · Diego 2026-07-22).
    const popoverOpenRef = useRef(false);
    useEffect(() => {
        if (!defaultOpen) return;
        const t = setTimeout(() => {
            if (!popoverOpenRef.current) bellRef.current?.click();
        }, 60);
        return () => clearTimeout(t);
    }, [defaultOpen]);

    // Auto-open the bell once when the user enters the Dupler d1.1 flow so
    // the Non-CET notification is discoverable without extra clicks. Guard
    // via ref so we don't accidentally toggle (close) an already-open
    // popover.
    const duplerD11AutoOpened = useRef(false);
    useEffect(() => {
        if (!shouldShowDuplerD11) { duplerD11AutoOpened.current = false; return; }
        if (duplerD11AutoOpened.current) return;
        duplerD11AutoOpened.current = true;
        const t = setTimeout(() => {
            // Only auto-open if user hasn't already opened the popover manually.
            if (!popoverOpenRef.current) bellRef.current?.click();
        }, 400);
        return () => clearTimeout(t);
    }, [shouldShowDuplerD11]);

    // F41.a Task B · Auto-open the bell when user enters w1.2 · w2.1 · w2.4.
    // Delay 500ms (post-F21 · misma guardia que Dupler). Reset del tracker
    // cuando el step cambia · una notif por step. Si el user cierra sin
    // interactuar · el registry sigue activo (unread badge visible en el bell).
    const workspacesAutoOpenedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isWorkspacesActive || !workspacesStepConfig) {
            workspacesAutoOpenedRef.current = null;
            return;
        }
        if (workspacesAutoOpenedRef.current === workspacesStepConfig.id) return;
        workspacesAutoOpenedRef.current = workspacesStepConfig.id;
        const t = setTimeout(() => {
            if (!popoverOpenRef.current) bellRef.current?.click();
        }, 500);
        return () => clearTimeout(t);
    }, [isWorkspacesActive, workspacesStepConfig?.id]);

    // F42.a Task A · Auto-open pattern análogo para Continua · 500ms delay ·
    // guard popoverOpenRef · tracking del step id (una sola auto-open por step).
    const continuaAutoOpenedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isContinuaActive || !continuaStepConfig) {
            continuaAutoOpenedRef.current = null;
            return;
        }
        if (continuaAutoOpenedRef.current === continuaStepConfig.id) return;
        continuaAutoOpenedRef.current = continuaStepConfig.id;
        const t = setTimeout(() => {
            if (!popoverOpenRef.current) bellRef.current?.click();
        }, 500);
        return () => clearTimeout(t);
    }, [isContinuaActive, continuaStepConfig?.id]);

    return (
        <>
        <Popover className="relative">
            {({ open }) => {
                // F21 · mirror the open state to the ref used by auto-open
                // useEffects so they can skip firing if the popover is
                // already open (prevents race-toggle-close bug).
                popoverOpenRef.current = open;
                return (<>
                    <PopoverButton
                        ref={bellRef}
                        onClick={() => {
                            // ST-1169 · Diego 2026-09-11 · reset dismissed state on bell click
                            // para que el flow A pueda re-triggerse desde la notif sin reload.
                            // Impacta solo al profile ack-vs-po (guard interno en isAckVsPoActive).
                            if (isAckVsPoProfile) setAckVsPoDismissed(false)
                        }}
                        className={clsx(
                        "relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none",
                        (open || isStepAutoOpen || sampleTextileActive) ? "bg-black/5 dark:bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground dark:hover:text-white"
                    )}>
                        <BellIcon className="w-5 h-5" />
                        {(isStepAutoOpen || sampleTextileActive) && (
                            <span className="absolute inset-0 rounded-full ring-2 ring-green-500 animate-pulse" />
                        )}
                        {totalCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive dark:bg-destructive ring-2 ring-background" />
                        )}
                    </PopoverButton>

                    {/* Normal popover - hidden when auto-open steps to avoid duplication */}
                    {!isStepAutoOpen && !sampleTextileActive && <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-2 scale-95"
                    >
                        <PopoverPanel className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 focus:outline-none transition-all duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                            <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                                <>
                                    {/* Header */}
                                    <div className="px-5 pt-5 pb-3 shrink-0">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                                            <div className="flex items-center gap-2">
                                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                                </button>
                                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                                    <XMarkIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <FilterTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                                        {filteredNotifications.length > 0 ? (
                                            filteredNotifications.map(notification => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onActionClick={(action) => {
                                                        // ORD-2056 delay scenario · View Order CTA navigates to the OrderDetail page with the delay items loaded.
                                                        if (notification.id === 'shipment-delayed-ord-2056' && action === 'View Order') {
                                                            try { sessionStorage.setItem('demo:selectedOrderId', '#ORD-2056') } catch { /* ignore */ }
                                                            window.dispatchEvent(new CustomEvent('demo:navigate', { detail: { page: 'order-detail' } }))
                                                        }
                                                        // Dupler d1.1 · Import vendor data advances the local
                                                        // DuplerPdfProcessor to the upload-zone phase. Both
                                                        // actions hide the notification here immediately +
                                                        // DuplerPdfProcessor will confirm the hide by
                                                        // dispatching `dupler:non-cet-hide` when scrapePhase
                                                        // transitions away from 'notification'. F21 · also
                                                        // close the popover so the user isn't left staring
                                                        // at "No updates found" or stale notifications.
                                                        if (notification.id === 'dupler-d11-non-cet') {
                                                            if (action === 'Import vendor data') {
                                                                window.dispatchEvent(new CustomEvent('dupler:import-vendor-data'));
                                                            }
                                                            setShouldShowDuplerD11(false);
                                                            setTimeout(() => {
                                                                if (popoverOpenRef.current) bellRef.current?.click();
                                                            }, 50);
                                                        }
                                                        // F41.a Task B · Workspaces notif CTAs (w1.2 · w2.1 · w2.4).
                                                        // Review CTAs avanzan al siguiente step (Sarah aprueba · Letza
                                                        // GL · CFO cierra popover). Dismiss oculta la notif del registry
                                                        // pero deja al user en el step actual. Post-CTA se cierra el
                                                        // popover para no dejar al user viendo la notif ya procesada.
                                                        if (notification.id.startsWith('workspaces-')) {
                                                            if (action === 'Review expense' || action === 'Review GL') {
                                                                nextStep();
                                                            }
                                                            setWorkspacesDismissed(prev => new Set(prev).add(notification.id));
                                                            setTimeout(() => {
                                                                if (popoverOpenRef.current) bellRef.current?.click();
                                                            }, 50);
                                                        }
                                                        // ST-1169 · Diego 2026-09-09 · ACK vs PO CTA "Compare with PO".
                                                        // Dispara CustomEvent · AckVsPoApp lo escucha en Fase 2 para
                                                        // arrancar el staging view (auto-pull sim del PO). Dismiss
                                                        // esconde la notif del registry.
                                                        if (notification.id === 'ack-vs-po-new-ack') {
                                                            if (action === 'Compare with PO') {
                                                                window.dispatchEvent(new CustomEvent('ack-vs-po:start-compare', {
                                                                    detail: { poNumber: 'PO-2026-1042', vendor: 'Herman Miller' },
                                                                }));
                                                            }
                                                            setAckVsPoDismissed(true);
                                                            setTimeout(() => {
                                                                if (popoverOpenRef.current) bellRef.current?.click();
                                                            }, 50);
                                                        }
                                                        // F42.a Task A · Continua notif CTAs (los 9 registrados).
                                                        // Review/Start CTAs disparan el phase transition local (el scene
                                                        // avanza a 'processing') via CustomEvent · el ActionCenter no
                                                        // conoce el phase local del scene. Cada scene escucha su evento
                                                        // correspondiente y actualiza su phase state machine. Dismiss
                                                        // solo esconde la notif · deja al user en el step actual.
                                                        if (notification.id.startsWith('continua-')) {
                                                            const isReviewCta = action !== 'Dismiss';
                                                            if (isReviewCta) {
                                                                window.dispatchEvent(new CustomEvent('continua:advance-phase', {
                                                                    detail: { notificationId: notification.id },
                                                                }));
                                                            }
                                                            setContinuaDismissed(prev => new Set(prev).add(notification.id));
                                                            setTimeout(() => {
                                                                if (popoverOpenRef.current) bellRef.current?.click();
                                                            }, 50);
                                                        }
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                <BellIcon className="w-12 h-12 mb-3 text-gray-300 dark:text-muted-foreground" />
                                                <p className="text-sm font-medium">No updates found</p>
                                                <p className="text-xs mt-1">You're all caught up!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {filteredNotifications.length} actions
                                        </p>
                                        <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                            {urgentCount} urgent
                                        </p>
                                    </div>
                                </>

                            </div>
                        </PopoverPanel>
                    </Transition>}
                </>);
            }}
        </Popover>

        {/* Flow 3 · Sample & Textile — email-style notifications (Wendy items 9 & 10) */}
        {sampleTextileActive && (
            <>
                {/* No backdrop — a notification must not block the page. Panel sits above the navbar via z-[200]. */}
                <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-[200] animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                    <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai/15 text-ai font-bold">Sample &amp; Textile</span>
                                </div>
                                <button
                                    onClick={() => setSampleTextileActive(false)}
                                    aria-label="Close"
                                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Email-style notification (phase-dependent) */}
                        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                {samplePhase === 'request' ? (
                                    <NotificationItem
                                        notification={SAMPLE_REQUEST_NOTIF}
                                        onActionClick={(action) => {
                                            if (action === 'Review in quote') {
                                                window.dispatchEvent(new CustomEvent('sample-textile:focus', { detail: { sku: 'F-SSC346030C' } }));
                                                setSampleTextileActive(false);
                                            }
                                        }}
                                    />
                                ) : (
                                    <NotificationItem
                                        notification={sampleResponseNotif(sampleTracking ?? 'SMP-2026')}
                                        onActionClick={(action) => {
                                            if (action === 'View response') {
                                                window.dispatchEvent(new CustomEvent('sample-textile:reopen'));
                                                setSampleTextileActive(false);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                            <p className="text-xs font-medium text-muted-foreground">1 action</p>
                            <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                                <SparklesIcon className="w-3.5 h-3.5" />
                                Sample &amp; textile flow
                            </p>
                        </div>
                    </div>
                </div>
            </>
        )}

        {/* Step 1.10: Always-visible Action Center with Flow 1 notifications */}
        {isStep19 && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">Flow 1</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                </button>
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <FilterTabs tabs={flow1Tabs} activeTab="all" onTabChange={() => {}} />
                    </div>

                    {/* Flow 1 — Single focused notification */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                        {FLOW1_NOTIFICATIONS.map((notification) => (
                            <div key={notification.id} className="animate-in fade-in slide-in-from-top-2 duration-500">
                                <NotificationItem
                                    notification={notification}
                                    onActionClick={(action) => {
                                        if (action === 'View PO') nextStep();
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                        <p className="text-xs font-medium text-muted-foreground">
                            1 action
                        </p>
                        <p className="text-xs font-bold text-success flex items-center gap-1.5">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            PO generated
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* BFI Step a1.1: Always-visible Action Center — Miller Knoll quote request */}
        {isStepA11 && !a11PanelClosed && notifDelayReady && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                                {a11IngestState === 'idle' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-bold">1 new</span>
                                )}
                                {a11IngestState === 'ingesting' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai/15 text-ai font-bold animate-pulse">Ingesting…</span>
                                )}
                                {a11IngestState === 'ready' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">Ready</span>
                                )}
                            </div>
                            {a11IngestState === 'idle' && (
                                <button onClick={() => setA11PanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body — depends on ingest state */}
                    <div className="px-5 pb-5 space-y-3">

                        {/* idle: original notification card */}
                        {a11IngestState === 'idle' && (
                            <div className="relative rounded-2xl ring-2 ring-primary shadow-lg shadow-primary/20 animate-in fade-in duration-500">
                                <span className="absolute -top-2 right-4 text-[9px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded-full shadow-sm z-10">
                                    INCOMING
                                </span>
                                <NotificationItem
                                    notification={BFI_A11_NOTIFICATIONS[0]}
                                    onActionClick={(action) => {
                                        if (action === 'Ingest with Strata') handleA11Ingest()
                                    }}
                                />
                            </div>
                        )}

                        {/* ingesting: processing animation */}
                        {a11IngestState === 'ingesting' && (
                            <div className="rounded-2xl bg-muted dark:bg-zinc-800 border border-border p-5 space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-ai/10 flex items-center justify-center shrink-0">
                                        <SparklesIcon className="w-4 h-4 text-ai animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Ingesting with Strata AI…</p>
                                        <p className="text-[11px] text-muted-foreground">DOE-2847 · Miller Knoll quote</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {A11_INGEST_LINES.slice(0, a11IngestCount).map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] animate-in fade-in duration-300 ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-ai rounded-full transition-all duration-700"
                                        style={{ width: `${Math.round((a11IngestCount / A11_INGEST_LINES.length) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ready: email detail + all lines + Review Order button */}
                        {a11IngestState === 'ready' && (
                            <div className="rounded-2xl bg-muted dark:bg-zinc-800 border border-border overflow-hidden animate-in fade-in duration-400">
                                {/* Email header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                    <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                    <span className="text-sm font-semibold text-foreground flex-1">New quote request · Miller Knoll</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 8:14 AM</span>
                                </div>
                                {/* Email meta */}
                                <div className="px-4 py-3 space-y-1 border-b border-border">
                                    {[
                                        { label: 'From', value: 'Account Manager Bly · Miller Knoll Rep' },
                                        { label: 'Re',   value: 'DOE-2847 · NYC Dept. of Education · quote request' },
                                    ].map(f => (
                                        <div key={f.label} className="flex gap-2 text-[11px]">
                                            <span className="text-muted-foreground w-8 shrink-0">{f.label}</span>
                                            <span className="text-foreground font-medium">{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Attachments */}
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Attachments:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-ai font-medium px-2 py-0.5 rounded bg-ai/10 border border-ai/20">
                                        <DocumentTextIcon className="w-3 h-3" /> DOE-2847.sif
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/40 border border-border">
                                        <DocumentTextIcon className="w-3 h-3" /> NYC-DOE-2847-specs.pdf
                                    </span>
                                </div>
                                {/* AI results */}
                                <div className="px-4 py-3 border-b border-border space-y-2">
                                    {A11_INGEST_LINES.map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {a11IngestState === 'idle' && (
                        <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                            <p className="text-xs font-medium text-muted-foreground">1 action</p>
                            <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                                Awaiting ingest
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* BFI Steps a1.2d / a1.2e / a1.2f / a1.3b: Generic incoming-event notification panel */}
        {isBfiStepActive && bfiStepConfig && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] lg:w-[520px] z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                bfiStepConfig.badgeColor === 'warning' ? 'bg-warning/15 text-warning' :
                                bfiStepConfig.badgeColor === 'success' ? 'bg-success/15 text-success' :
                                'bg-foreground/10 text-foreground'
                            }`}>{bfiStepConfig.badge}</span>
                        </div>
                        <button onClick={() => setBfiPanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-5">
                        <div className="rounded-2xl bg-muted dark:bg-zinc-800 border border-border overflow-hidden">
                            {/* Email subject line */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                <span className="text-sm font-semibold text-foreground flex-1">{bfiStepConfig.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 9:30 AM</span>
                            </div>
                            {/* Email meta */}
                            <div className="px-4 py-3 border-b border-border space-y-1">
                                <div className="flex gap-2 text-[11px]">
                                    <span className="text-muted-foreground w-10 shrink-0">From</span>
                                    <span className="text-foreground font-medium">{bfiStepConfig.sender}</span>
                                </div>
                                {bfiStepConfig.re ? (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Re</span>
                                        <span className="text-foreground">{bfiStepConfig.re}</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Info</span>
                                        <span className="text-foreground">{bfiStepConfig.desc}</span>
                                    </div>
                                )}
                            </div>
                            {/* Attachment chip — only when present */}
                            {bfiStepConfig.attachment && (
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Attachment:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-success font-medium px-2 py-0.5 rounded bg-success/10 border border-success/20">
                                        <DocumentTextIcon className="w-3 h-3" /> {bfiStepConfig.attachment}
                                    </span>
                                </div>
                            )}
                            {/* Body excerpt — shown only when re is present (full email style) */}
                            {bfiStepConfig.re && (
                                <div className="px-4 py-3 border-b border-border">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{bfiStepConfig.desc}</p>
                                </div>
                            )}
                            <div className="px-4 py-4">
                                <button
                                    onClick={() => {
                                        setBfiPanelClosed(true);
                                        window.dispatchEvent(new CustomEvent(bfiStepConfig.event));
                                    }}
                                    className="w-full py-2.5 text-[12px] font-black rounded-xl bg-foreground text-background hover:opacity-80 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    {bfiStepConfig.cta}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">1 action</p>
                        <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                            {bfiStepConfig.footerText}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Step 2.6: Always-visible Action Center with Flow 2 Acknowledgement notifications */}
        {isStep27 && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-foreground">Action Center</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info font-bold">Flow 2</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                </button>
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <FilterTabs tabs={flow2Tabs} activeTab="all" onTabChange={() => {}} />
                    </div>

                    {/* Flow 2 Notifications */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                        {FLOW2_NOTIFICATIONS.map((notification, i) => {
                            const isCRMSync = notification.id === 'f2-crm-sync';
                            const isDelivered = notifDelivered27.includes(i);
                            return (
                                <div
                                    key={notification.id}
                                    className={clsx(
                                        "transition-all duration-700",
                                        isDelivered
                                            ? 'opacity-100 translate-y-0'
                                            : 'opacity-0 translate-y-4 h-0 overflow-hidden'
                                    )}
                                >
                                    <div className={clsx(
                                        "relative rounded-2xl transition-all duration-500",
                                        isCRMSync && isDelivered && "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-lg shadow-brand-500/20"
                                    )}>
                                        <NotificationItem
                                            notification={notification}
                                            onActionClick={isCRMSync ? () => nextStep() : undefined}
                                        />
                                        {isDelivered && !isCRMSync && (
                                            <span className="absolute top-3 right-3 text-[9px] font-bold text-success flex items-center gap-1 bg-success/10 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon className="w-3 h-3" /> Delivered
                                            </span>
                                        )}
                                        {isCRMSync && isDelivered && (
                                            <span className="absolute top-3 right-3 text-[9px] font-bold text-brand-700 dark:text-brand-400 flex items-center gap-1 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-full animate-pulse">
                                                Next Step →
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-border bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                        <p className="text-xs font-medium text-muted-foreground">
                            {notifDelivered27.length} actions
                        </p>
                        {notifDelivered27.includes(3) ? (
                            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                                CRM sync ready
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                {FLOW2_NOTIFICATIONS.filter(n => n.priority === 'high').length} urgent
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
