// ═══════════════════════════════════════════════════════════════════════════════
// Demo Profile Registry — Central configuration for multi-demo support
// ═══════════════════════════════════════════════════════════════════════════════

import type { StepBehavior } from '../components/demo/DemoStepBanner';
import { COI_STEPS, COI_STEP_BEHAVIOR, COI_STEP_MESSAGES, COI_SELF_INDICATED } from './profiles/coi';
import { COI_DEMO_STEPS, COI_DEMO_STEP_BEHAVIOR, COI_DEMO_STEP_MESSAGES, COI_DEMO_SELF_INDICATED } from './profiles/coi-demo';
import { DUPLER_STEPS, DUPLER_STEP_BEHAVIOR, DUPLER_STEP_MESSAGES, DUPLER_SELF_INDICATED } from './profiles/dupler';
import { OPS_DEMO_STEPS, OPS_DEMO_STEP_BEHAVIOR, OPS_DEMO_STEP_MESSAGES, OPS_DEMO_SELF_INDICATED } from './profiles/ops-demo';
import { CONTINUA_DEMO_STEPS, CONTINUA_DEMO_STEP_BEHAVIOR, CONTINUA_DEMO_STEP_MESSAGES, CONTINUA_DEMO_SELF_INDICATED } from './profiles/continua-demo';
import { WRG_DEMO_STEPS, WRG_DEMO_STEP_BEHAVIOR, WRG_DEMO_STEP_MESSAGES, WRG_DEMO_SELF_INDICATED } from './profiles/wrg-demo';
import { MBI_STEPS, MBI_STEP_BEHAVIOR, MBI_STEP_MESSAGES, MBI_SELF_INDICATED } from './profiles/mbi';
import { LELAND_STEPS, LELAND_STEP_BEHAVIOR, LELAND_STEP_MESSAGES, LELAND_SELF_INDICATED } from './profiles/leland-demo';
import { BFI_STEPS, BFI_STEP_BEHAVIOR, BFI_STEP_MESSAGES, BFI_SELF_INDICATED } from './profiles/bfi';
import { WORKSPACES_STEPS, WORKSPACES_STEP_BEHAVIOR, WORKSPACES_STEP_MESSAGES, WORKSPACES_SELF_INDICATED } from './profiles/workspaces';
import { OFFICEWORKS_STEPS, OFFICEWORKS_STEP_BEHAVIOR, OFFICEWORKS_STEP_MESSAGES, OFFICEWORKS_SELF_INDICATED } from './profiles/officeworks';
import {
    INBOUND_OUTBOUND_STEPS,
    INBOUND_OUTBOUND_STEP_BEHAVIOR,
    INBOUND_OUTBOUND_STEP_MESSAGES,
    INBOUND_OUTBOUND_SELF_INDICATED,
} from './profiles/inbound-outbound';
import { CLC_STEPS, CLC_STEP_BEHAVIOR, CLC_STEP_MESSAGES, CLC_SELF_INDICATED } from './profiles/clc';
import { CRM_STEPS, CRM_STEP_BEHAVIOR, CRM_STEP_MESSAGES, CRM_SELF_INDICATED } from './profiles/crm';

export type SimulationApp =
    | 'dashboard' | 'expert-hub' | 'email-marketplace'
    | 'quote-po' | 'dealer-kanban' | 'service-now'
    | 'catalog' | 'survey' | 'ack-detail' | 'order-detail'
    | 'quote-detail' | 'transactions' | 'mac' | 'inventory'
    | 'crm'
    | 'quote-converter'
    | 'expert-hub-published'
    | 'dupler-pdf' | 'dupler-warehouse' | 'dupler-reporting'
    | 'wrg-estimator'
    | 'mbi-overview' | 'mbi-budget' | 'mbi-accounting' | 'mbi-quotes' | 'mbi-design'
    | 'leland-strata' | 'leland-inbox' | 'leland-seradex' | 'leland-review'
    | 'bfi-agency-fee' | 'bfi-receiving'
    | 'workspaces-submit' | 'workspaces-approval' | 'workspaces-ap' | 'workspaces-reporting'
    | 'officeworks-intake' | 'officeworks-design' | 'officeworks-spec-check' | 'officeworks-submission' | 'officeworks-dashboard' | 'officeworks-labor' | 'officeworks-sales'
    | 'clc-calendar' | 'clc-sharepoint' | 'clc-intake' | 'clc-dashboard';

export interface DemoStep {
    id: string;
    groupId: number;
    groupTitle: string;
    title: string;
    description: string;
    app: SimulationApp;
    role: 'Expert' | 'System' | 'Dealer' | 'End User' | 'Sales Rep' | 'Facility Manager' | 'Facility User' | 'Designer' | 'Sales Coordinator' | 'Estimator' | 'Project Manager' | 'Operations Manager' | 'AP Coordinator' | 'CFO' | 'CAO' | 'Employee' | 'Account Manager' | 'Receiving Coordinator' | 'Finance / AR' | 'Accountant' | 'BFI Manager' | 'Design Manager' | 'Order Entry' | 'Order Entry Manager' | 'Production Manager' | 'Logistics' | 'AR/AP' | 'Director of Operations' | 'Office Director';
    highlightId?: string;
    /** Optional grouping key for multi-flow profiles (ej. CLC: 'calendar' | 'sharepoint' | 'intake' | 'data-lake'). */
    flowId?: string;
}

export type DemoProfileId = 'acme' | 'coi' | 'dupler' | 'ops' | 'continua' | 'wrg' | 'mbi' | 'leland' | 'bfi' | 'workspaces' | 'officeworks' | 'inbound-outbound' | 'clc' | 'crm' | 'expert-hub' | 'quote-converter';

/** Icon aliases surface as Lucide icons via components/RoleSwitcher.tsx's ICON_MAP. */
export type RoleIcon =
    | 'factory' | 'store' | 'building' | 'user' | 'users' | 'wrench'
    | 'truck' | 'palette' | 'clipboard-check' | 'calculator' | 'sparkles'
    | 'receipt' | 'shield' | 'mail' | 'calendar' | 'folder';

export interface RoleDef {
    /** Stable slug persisted in sessionStorage (${profileId}:role). */
    id: string;
    /** Human label shown in the RoleSwitcher menu + trigger. */
    label: string;
    /** Optional icon alias (see RoleIcon). Falls back to a generic user icon. */
    icon?: RoleIcon;
}

export interface DemoProfile {
    id: DemoProfileId;
    /** Feature-first title shown in the dropdown (ej: "Spec Check & Design Validation").
     *  Does NOT include the client name. */
    title: string;
    /** Cliente + scenes complementarias (ej: "Officeworks · Intake + CET/CAP + Audit").
     *  Optional. Shown below the title in the dropdown. */
    subtitle?: string;
    /** Legacy label kept for compat (some tour components still read it).
     *  New code should use `title`. */
    name: string;
    companyName: string;
    description: string;
    icon: string;
    /** Optional override for the navbar's small uppercase label.
     *  Defaults to "Dealer Experience" if not set. */
    experienceLabel?: string;
    steps: DemoStep[];
    stepBehavior: Record<string, StepBehavior>;
    stepMessages: Record<string, string[]>;
    selfIndicatedSteps: string[];

    // ─── Role switching (generalized in F3) ──────────────────────────────────
    /** Roles this experience can be "viewed as" (Dealer / Manufacturer / etc). */
    roles?: RoleDef[];
    /** First role rendered before the user picks; falls back to roles[0]. */
    defaultRoleId?: string;
    /** When true, RoleSwitcher renders in the navbar. */
    hasRoleSwitcher?: boolean;

    // ─── Landing modo normal (F5+) ──────────────────────────────────────────
    /**
     * SimulationApp to render when the user opens this experience WITHOUT
     * launching the tour. Same canvas that scene-1 of the tour shows,
     * without spotlight/overlays. Makes the profile self-explanatory
     * before the user hits "Start Demo".
     */
    defaultApp?: SimulationApp;

    // ─── CSV categorization (F16.5) ────────────────────────────────────────
    /**
     * Sub-section within the dropdown "Experiences" category:
     *  · 'feature-module' — matches a `Category: Feature module` row in the
     *    docs/experience-map.csv (8 experiences: WRG · Dupler · CLC ·
     *    Officeworks · BFI · Leland · MBI · Strata CRM).
     *  · 'tour-profile'   — profiles that only appear in the CSV as `Profile(s)`
     *    consumers of shared modules (6 tours: Inbound|Outbound · Workscapes ·
     *    Continua · OPS · COI · Acme).
     * Undefined defaults to 'tour-profile' for backward compat.
     */
    experienceKind?: 'feature-module' | 'tour-profile';

    // ─── Auto-start (F44) ───────────────────────────────────────────────────
    /**
     * When true, `DemoContext` flips `isDemoActive` a `true` al aterrizar en
     * este profile (mount o change desde dropdown). Necesario cuando el step
     * 1.1 depende de `isDemoActive` para arrancar su autoplay timeline (ej.
     * COI · `EmailSimulation` L90-101 · el AI Processing Modal no dispara si
     * `isDemoActive === false`). Sin este flag el user tiene que ir a "Start
     * Demo" manualmente para que corra el flow.
     */
    autoStart?: boolean;

    // ─── Chrome-less content mode (F44.a.3) ────────────────────────────────
    /**
     * When true, App.tsx esconde los componentes de scaffolding del tour
     * (`DemoSidebar` con la lista de steps · `DemoStepBanner` bottom bar ·
     * `DemoSpotlight` overlay · `DemoAIIndicator` pill) para que el user solo
     * vea el contenido de la app en cada step. `DemoProcessPanel` se mantiene
     * porque drivea los timers de auto-advance y muestra los content modals
     * de cada step (ej. Normalization Pipeline en step 1.3). También quita
     * el `pl-80` del main viewport ya que no hay sidebar que compensar.
     */
    hideChrome?: boolean;

    // ─── Production-first grouping (F78 · 2026-08-18) ───────────────────────
    /**
     * Madurez de la experiencia · usada por `ExperienceSwitcher` para agrupar
     * las publicadas al top y aplicar el badge visual (Production = success
     * tone / Demo = neutral tone). Defaults a 'demo' si no se define.
     *  · 'production' — código sincronizado desde una app real en producción
     *    (via prod-sync F19/F43 · o alineación explícita a prod como QC F26.E)
     *  · 'demo'       — experience puramente demo · aunque use vocabulario o
     *    componentes reales · nunca fue empujado como sync desde el repo prod
     */
    maturity?: 'production' | 'demo';

    /**
     * Cuando esta experiencia es un "customer story" o child de una experience
     * publicada (e.g. `continua` es un tour que usa Expert Hub como app · queda
     * agrupado bajo "Expert Hub · Published"). Undefined = standalone.
     */
    parentExperience?: 'expert-hub' | 'quote-converter';

    /**
     * Etiqueta de origen · se muestra debajo del subtitle en el dropdown ·
     * ejemplos:
     *  · "expert-hub@f59da74 · synced F19 + F43.a"
     *  · "quote-converter prod · Leland-grounded (F26.E)"
     *  · "BFI · dealer standalone"
     */
    sourceLabel?: string;

    /**
     * Fecha ISO (YYYY-MM-DD) de la última actualización relevante · usada por
     * ExperienceSwitcher para ordenar la sección de standalone demos (más
     * reciente primero). Curación manual initial pass; script en el futuro.
     */
    lastUpdated?: string;

    /**
     * Naturaleza del demo · signaling en el switcher sin nombrar al cliente:
     *   · 'client-demo'   — armado para presentación de cliente específico
     *   · 'in-progress'   — experiencia interna de Strata que estamos
     *     construyendo · producto o platform-focused (no cliente puntual)
     * Default (undefined) = 'client-demo'.
     */
    demoOrigin?: 'client-demo' | 'in-progress';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO_PROFILES · production-first ordering (F78 · 2026-08-18)
//
// Order:
//   1. Production experiences (Expert Hub · Quote Converter) — first
//   2. Feature modules (existing 8) — retained order
//   3. Tour profiles (existing 6) — retained order
//
// ExperienceSwitcher renders 3 grouped sections based on `maturity` +
// `parentExperience`:
//   · "Expert Hub · Published"     — expert-hub + parentExperience='expert-hub'
//   · "Quote Converter · Published" — quote-converter + parentExperience='quote-converter'
//   · "Standalone demos"           — everything else, sorted by lastUpdated desc
//
// Sub-header split (feature-module / tour-profile) preserved via `experienceKind`
// for backwards compat but no longer drives the grouping.
// ═══════════════════════════════════════════════════════════════════════════════
export const DEMO_PROFILES: DemoProfile[] = [
    // ─── PRODUCTION EXPERIENCES (2) · F78 · 2026-08-18 ─────────────────────
    {
        id: 'expert-hub',
        title: 'Expert Hub',
        subtitle: 'Transactions · OCR · Comparisons · Feedback',
        name: 'Expert Hub',
        // F78.e · Diego 2026-08-18 · companyName = product name para que el
        // navbar principal muestre "Expert Hub" y no "Strata" · consistente
        // con el pattern donde companyName drivea el H1 del switcher trigger.
        companyName: 'Expert Hub',
        description: 'Multi-tenant back-office platform · production sync from expert-hub · Transactions inbox + OCR + PO-vs-ACK comparisons + Create Record wizard + Feedback loop',
        icon: '🛡️',
        experienceLabel: 'Published product',
        // Renderizado via `ExpertHubTransactionsWrapper` (TenantProvider + noop
        // callbacks · prod-sync copy en blocks/prod-imports/) · NO requiere
        // currentStep como el legacy case 'expert-hub'.
        defaultApp: 'expert-hub-published',
        steps: [],
        stepBehavior: {},
        stepMessages: {},
        selfIndicatedSteps: [],
        maturity: 'production',
        parentExperience: 'expert-hub',
        sourceLabel: 'expert-hub@f59da74 · synced F19 + F43.a',
        lastUpdated: '2026-07-28',
        experienceKind: 'feature-module',
    },
    {
        id: 'quote-converter',
        title: 'Quote Converter',
        subtitle: 'SIF Generator · OCR Tracking · Observability',
        name: 'Quote Converter',
        // F78.e · Diego 2026-08-18 · ver nota en 'expert-hub' arriba · el
        // navbar muestra companyName · debe ser el product name, no 'Strata'.
        companyName: 'Quote Converter',
        description: 'Standalone quote-to-SIF converter · production app grounded in Leland Order SO2604102 · DS primitives (FileUploadModal · DocumentReviewModal · EditableLineTable)',
        icon: '🔁',
        experienceLabel: 'Published product',
        defaultApp: 'quote-converter',
        steps: [],
        stepBehavior: {},
        stepMessages: {},
        selfIndicatedSteps: [],
        maturity: 'production',
        parentExperience: 'quote-converter',
        sourceLabel: 'quote-converter prod · Leland-grounded (F26.E)',
        lastUpdated: '2026-07-14',
        experienceKind: 'feature-module',
    },

    // ─── FEATURE MODULES (8) · in CSV row order ────────────────────────────
    {
        id: 'wrg',
        title: 'Labor Estimation',
        subtitle: 'Dealer Onyx · Estimator + Designer Verification + Sales Review + Handoff',
        name: 'Dealer Onyx',
        companyName: 'Dealer Onyx',
        description: 'Quoting lifecycle — intake to client proposal',
        icon: '🔧',
        defaultApp: 'wrg-estimator',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'WRG · dealer standalone',
        lastUpdated: '2026-07-18',
        steps: WRG_DEMO_STEPS,
        stepBehavior: WRG_DEMO_STEP_BEHAVIOR,
        stepMessages: WRG_DEMO_STEP_MESSAGES,
        selfIndicatedSteps: WRG_DEMO_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'quote-to-sif',
        roles: [
            { id: 'quote-to-sif', label: 'Quote-to-SIF', icon: 'calculator' },
            { id: 'dealer',       label: 'Dealer',       icon: 'store' },
            { id: 'designer',     label: 'Designer',     icon: 'palette' },
        ],
    },
    {
        id: 'dupler',
        title: 'Vendor Data → SIF → Warehouse',
        subtitle: 'Dealer Cedar · PDF Extraction + Warehouse & Transit + Reporting',
        name: 'Dealer Cedar',
        companyName: 'Dealer Cedar',
        description: 'PDF→SIF, Warehouse & Transit, Unified Reporting',
        icon: '📄',
        defaultApp: 'dupler-pdf',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'Dupler · dealer standalone',
        lastUpdated: '2026-07-16',
        steps: DUPLER_STEPS,
        stepBehavior: DUPLER_STEP_BEHAVIOR,
        stepMessages: DUPLER_STEP_MESSAGES,
        selfIndicatedSteps: DUPLER_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'quote-to-sif',
        roles: [
            { id: 'quote-to-sif',  label: 'Quote-to-SIF',  icon: 'calculator' },
            { id: 'manufacturer',  label: 'Manufacturer',  icon: 'factory' },
            { id: 'designer',      label: 'Designer',      icon: 'palette' },
        ],
    },
    {
        id: 'clc',
        title: 'Install Scheduling + Data Reconciliation',
        subtitle: 'Dealer Amber · Calendar Sync + SharePoint Seeding + Intake Validation + Data Lake',
        name: 'Dealer Amber',
        companyName: 'Dealer Amber',
        description: 'IQ × Outlook × SharePoint × M365 · install scheduling · asset seeding · intake validation · data lake',
        icon: '📅',
        experienceLabel: 'Operations Experience',
        // F26 · era 'clc-dashboard' · Diego pidió que la landing default
        // sea el flujo hero (Schedule AI · CLCCalendarScene) en vez del
        // Data Lake Dashboard · consistente con Dupler/Officeworks/Leland
        // que apuntan a su tab hero también · 2026-07-23.
        defaultApp: 'clc-calendar',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'CLC · install scheduling standalone',
        lastUpdated: '2026-07-23',
        steps: CLC_STEPS,
        stepBehavior: CLC_STEP_BEHAVIOR,
        stepMessages: CLC_STEP_MESSAGES,
        selfIndicatedSteps: CLC_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'installer',
        roles: [
            { id: 'installer',        label: 'Installer',        icon: 'wrench' },
            { id: 'facility-manager', label: 'Facility Manager', icon: 'building' },
        ],
    },
    {
        id: 'officeworks',
        title: 'Spec Check & Design Validation',
        subtitle: 'Dealer Falcon · Intake + CET/CAP + Teknion Preview + Audit',
        name: 'Dealer Falcon',
        companyName: 'Dealer Falcon Inc.',
        description: 'Spec Check & Design AI · Teknion BOM validation · Metro Legal 4th Floor',
        icon: '📐',
        // F28 · era 'officeworks-dashboard' · Diego pidió que la landing
        // default sea el flujo hero (OfficeworksPage con OfficeworksFunnel
        // visible · Metro Legal en Intake) en vez del Design Dashboard ·
        // consistente con Dupler/CLC/Leland que apuntan a su tab hero.
        // Análogo al fix F26 aplicado a CLC (defaultApp clc-dashboard →
        // clc-calendar) · Diego 2026-07-23.
        defaultApp: 'officeworks-intake',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'Officeworks · spec check standalone',
        lastUpdated: '2026-07-23',
        steps: OFFICEWORKS_STEPS,
        stepBehavior: OFFICEWORKS_STEP_BEHAVIOR,
        stepMessages: OFFICEWORKS_STEP_MESSAGES,
        selfIndicatedSteps: OFFICEWORKS_SELF_INDICATED,
        hasRoleSwitcher: true,
        // F22 · roles alineados con los 6 personas reales de los 27 steps del
        // profile officeworks (Design Manager · Designer · Peer Reviewer ·
        // Sales Coordinator · Sr Operations · Sales Lead). Antes eran
        // placeholder genéricos del CSV F18.polish.v2 que no matcheaban con
        // ningún step. Diego 2026-07-23.
        defaultRoleId: 'design-manager',
        roles: [
            { id: 'design-manager',    label: 'Design Manager',    icon: 'user' },
            { id: 'designer',          label: 'Designer',          icon: 'palette' },
            { id: 'peer-reviewer',     label: 'Peer Reviewer',     icon: 'clipboard-check' },
            { id: 'sales-coordinator', label: 'Sales Coordinator', icon: 'users' },
            { id: 'sr-operations',     label: 'Sr Operations',     icon: 'wrench' },
            { id: 'sales-lead',        label: 'Sales Lead',        icon: 'sparkles' },
        ],
    },
    {
        id: 'bfi',
        title: 'Agency Fee Lifecycle',
        subtitle: 'Dealer Copper · Pre-Award + Receiving & Claims + CPR Closing',
        name: 'Dealer Copper',
        companyName: 'Dealer Copper',
        description: 'Agency Fee AI · Metro Public Schools receiving workflow',
        icon: '🏛️',
        // F30 · era 'bfi-dashboard' · Diego pidió que la landing default
        // sea el flujo hero (Agency Fee AI · CoNYMorningQueue) en vez del
        // Operations Dashboard · consistente con Dupler/CLC/Officeworks/
        // Leland que apuntan a su tab hero. Análogo a F26 (CLC) y F28
        // (Officeworks). Diego 2026-07-23.
        defaultApp: 'bfi-agency-fee',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'BFI · agency fee standalone',
        lastUpdated: '2026-07-23',
        steps: BFI_STEPS,
        stepBehavior: BFI_STEP_BEHAVIOR,
        stepMessages: BFI_STEP_MESSAGES,
        selfIndicatedSteps: BFI_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'manufacturer',
        roles: [
            { id: 'manufacturer', label: 'Manufacturer', icon: 'factory' },
            { id: 'installer',    label: 'Installer',    icon: 'wrench' },
            { id: 'designer',     label: 'Designer',     icon: 'palette' },
        ],
    },
    {
        id: 'leland',
        title: 'PO-to-Order Automation',
        subtitle: 'Dealer Bear · PO Intake + Quote Match + Price Catch Review',
        name: 'Dealer Bear',
        companyName: 'Dealer Bear',
        description: 'Purchase order pipeline · materials review · exception handling',
        icon: '🪑',
        defaultApp: 'leland-strata',
        experienceKind: 'feature-module',
        maturity: 'demo',
        parentExperience: 'quote-converter',
        sourceLabel: 'Leland · cousin of Quote Converter (SO2604102 grounded)',
        lastUpdated: '2026-07-27',
        steps: LELAND_STEPS,
        stepBehavior: LELAND_STEP_BEHAVIOR,
        stepMessages: LELAND_STEP_MESSAGES,
        selfIndicatedSteps: LELAND_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'dealer',
        roles: [
            { id: 'dealer',       label: 'Dealer',       icon: 'store' },
            { id: 'expert-hub',   label: 'Expert Hub',   icon: 'shield' },
            { id: 'quote-to-sif', label: 'Quote-to-SIF', icon: 'calculator' },
        ],
    },
    {
        id: 'mbi',
        title: 'Back-Office AI (AP + AR + Quotes)',
        subtitle: 'Dealer Ivory · Accounting + Collections + Quotes AI',
        name: 'Dealer Ivory',
        companyName: 'Dealer Ivory',
        description: 'Furniture dealer · Budget Builder prototype + Accounting/Quotes/Design AI',
        icon: '🏢',
        defaultApp: 'mbi-accounting',
        experienceKind: 'feature-module',
        maturity: 'demo',
        sourceLabel: 'MBI · back-office AI standalone',
        lastUpdated: '2026-07-22',
        steps: MBI_STEPS,
        stepBehavior: MBI_STEP_BEHAVIOR,
        stepMessages: MBI_STEP_MESSAGES,
        selfIndicatedSteps: MBI_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'quote-to-sif',
        roles: [
            { id: 'quote-to-sif', label: 'Quote-to-SIF', icon: 'calculator' },
            { id: 'designer',     label: 'Designer',     icon: 'palette' },
        ],
    },
    {
        id: 'crm',
        title: 'CRM Standalone',
        subtitle: 'Strata CRM · Pipeline + Forecast + Design Intake + Opportunity Detail + AI Import',
        name: 'Strata CRM',
        companyName: 'Strata CRM',
        description: 'Pipeline · Forecast · Design Intake · Opportunity Detail · AI Import',
        icon: '👥',
        defaultApp: 'crm',
        experienceKind: 'feature-module',
        maturity: 'demo',
        demoOrigin: 'in-progress',
        sourceLabel: 'Strata CRM · pipeline + forecast standalone',
        lastUpdated: '2026-07-25',
        steps: CRM_STEPS,
        stepBehavior: CRM_STEP_BEHAVIOR,
        stepMessages: CRM_STEP_MESSAGES,
        selfIndicatedSteps: CRM_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'crm',
        roles: [
            { id: 'crm',    label: 'CRM',    icon: 'users' },
            { id: 'dealer', label: 'Dealer', icon: 'store' },
        ],
    },

    // ─── TOUR PROFILES (6) · CSV `Profile(s)` consumers of shared modules ──
    {
        id: 'inbound-outbound',
        // F78.m · Diego 2026-08-18 · rebrand a feature-name en vez de dealer
        // alias fake ("Dealer Cobalt" / "Manufacturer Indigo" era codename
        // interno). El demo es una capability showcase · no tiene client
        // story puntual · el label debe describir la capability.
        title: 'Transaction Management',
        subtitle: 'Inbound RFQ / Outbound Ack · Dealer ↔ Manufacturer transaction flow',
        name: 'Transaction Management',
        companyName: 'Transaction Management',
        description: 'End-to-end transaction management · inbound RFQ + PO · outbound quote + ack + shipping + invoice · 12 steps · 2 flows · presented from the dealer POV by default (manufacturer POV available in the role switcher).',
        icon: '📦',
        experienceLabel: 'Dealer Experience',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        sourceLabel: 'Transaction Management · dealer ↔ manufacturer capability showcase',
        // F78.l · Diego 2026-08-18 · promoted al top del standalone list
        // (was 2026-07-27) · queda como primer standalone demo visible.
        lastUpdated: '2026-08-18',
        steps: INBOUND_OUTBOUND_STEPS,
        stepBehavior: INBOUND_OUTBOUND_STEP_BEHAVIOR,
        stepMessages: INBOUND_OUTBOUND_STEP_MESSAGES,
        selfIndicatedSteps: INBOUND_OUTBOUND_SELF_INDICATED,
        hasRoleSwitcher: true,
        // F78.l · Diego 2026-08-18 · dealer POV default (antes 'manufacturer')
        defaultRoleId: 'dealer',
        roles: [
            { id: 'dealer',       label: 'Dealer',       icon: 'store' },
            { id: 'manufacturer', label: 'Manufacturer', icon: 'factory' },
        ],
    },
    {
        id: 'workspaces',
        title: 'Expense Management End-to-End',
        subtitle: 'Dealer Slate · Mobile OCR + Approval + GL Sync + CFO Dashboard',
        name: 'Dealer Slate',
        companyName: 'Dealer Slate',
        description: 'Expense report AI · GL auto-fill · CORE sync · spend dashboard',
        icon: '💰',
        defaultApp: 'workspaces-submit',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        demoOrigin: 'in-progress',
        sourceLabel: 'Workspaces · expense management standalone tour',
        lastUpdated: '2026-07-20',
        steps: WORKSPACES_STEPS,
        stepBehavior: WORKSPACES_STEP_BEHAVIOR,
        stepMessages: WORKSPACES_STEP_MESSAGES,
        selfIndicatedSteps: WORKSPACES_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'employee',
        roles: [
            { id: 'employee',  label: 'Employee',           icon: 'user' },
            { id: 'ops-mgr',   label: 'Operations Manager', icon: 'clipboard-check' },
            { id: 'ap-coord',  label: 'AP Coordinator',     icon: 'receipt' },
            { id: 'cfo',       label: 'CFO',                icon: 'calculator' },
        ],
    },
    {
        id: 'continua',
        title: 'Project & Inventory Intelligence',
        subtitle: 'Dealer Willow · Inventory + FM + Procurement + Sustainability',
        name: 'Dealer Willow',
        companyName: 'Dealer Willow',
        description: 'Project lifecycle, inventory intelligence & sustainability',
        icon: '🏗️',
        defaultApp: 'inventory',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        parentExperience: 'expert-hub',
        sourceLabel: 'Continua · Expert Hub tour (project & inventory)',
        lastUpdated: '2026-07-24',
        steps: CONTINUA_DEMO_STEPS,
        stepBehavior: CONTINUA_DEMO_STEP_BEHAVIOR,
        stepMessages: CONTINUA_DEMO_STEP_MESSAGES,
        selfIndicatedSteps: CONTINUA_DEMO_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'facility-manager',
        roles: [
            { id: 'facility-manager', label: 'Facility Manager', icon: 'building' },
            { id: 'facility-user',    label: 'Facility User',    icon: 'user' },
            { id: 'expert-hub',       label: 'Expert Hub',       icon: 'shield' },
            { id: 'manufacturer',     label: 'Manufacturer',     icon: 'factory' },
        ],
    },
    {
        id: 'ops',
        title: 'Receiving → Invoice → QB Sync',
        subtitle: 'Dealer Ember · 3-Way Match + Change Orders + CFO Dashboard',
        name: 'Dealer Ember',
        companyName: 'Dealer Ember',
        description: 'Receiving, invoicing & financial control',
        icon: '📊',
        // F42.h · defaultApp: 'expert-hub' (Diego 2026-07-27) · la experiencia
        // principal es el Receiving pipeline (step 1.1 · ReceivingAgent
        // auto-ingests ASN · 14 agents processing) · antes 'dashboard' aterrizaba
        // en content vacío (bug pre-existente · fix F42.g agregó fallback pero
        // Diego prefirió que arranque directo en el flow principal).
        //
        // F78.d · Diego 2026-08-18 · promoted a 'expert-hub-published' (wrapper
        // prod-sync F19+F43.a) para que el landing muestre la UI actualizada
        // de producción · antes usaba el case legacy (4566 LOC · out of date).
        // Los tour steps que aún tienen app='expert-hub' siguen renderizando
        // el legacy component · migración full de tour steps queda para
        // plan siguiente.
        defaultApp: 'expert-hub-published',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        parentExperience: 'expert-hub',
        sourceLabel: 'OPS · Expert Hub tour (receiving → invoice → QB)',
        lastUpdated: '2026-07-27',
        steps: OPS_DEMO_STEPS,
        stepBehavior: OPS_DEMO_STEP_BEHAVIOR,
        stepMessages: OPS_DEMO_STEP_MESSAGES,
        selfIndicatedSteps: OPS_DEMO_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'expert-hub',
        roles: [
            { id: 'expert-hub', label: 'Expert Hub', icon: 'shield' },
            { id: 'dealer',     label: 'Dealer',     icon: 'store' },
            { id: 'crm',        label: 'CRM',        icon: 'users' },
        ],
    },
    {
        id: 'coi',
        title: 'Email RFQ → PO → Warranty',
        subtitle: 'Dealer Sage · Email Ingestion + Kanban + Expert Hub + CRM',
        name: 'Dealer Sage',
        companyName: 'Dealer Sage',
        description: 'Contract office interiors',
        icon: '📧',
        defaultApp: 'email-marketplace',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        parentExperience: 'expert-hub',
        sourceLabel: 'COI · Expert Hub tour (email → kanban → hub → CRM)',
        // F78.k · Diego 2026-08-18 · backdated para que quede al final del
        // standalone list · es un auto-play tour (hideChrome+autoStart) que
        // arranca sin controles visibles · puede confundir · queda demoted.
        lastUpdated: '2026-01-15',
        // F44.a · Diego 2026-07-29 · el EmailSimulation step 1.1 gatea autoplay
        // en `isDemoActive === true`. Sin autoStart, el flow se congela en la
        // vista de email · no dispara AI Processing Modal · no avanza a Kanban.
        autoStart: true,
        // F44.a.3 · Diego 2026-07-29 · esconder el tour scaffolding (Demo Flow
        // sidebar · step banner · spotlight · AI indicator) · el user solo ve
        // el contenido de cada step (Email → Kanban → Expert Hub → etc).
        hideChrome: true,
        steps: COI_DEMO_STEPS,
        stepBehavior: COI_DEMO_STEP_BEHAVIOR,
        stepMessages: COI_DEMO_STEP_MESSAGES,
        selfIndicatedSteps: COI_DEMO_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'dealer',
        roles: [
            { id: 'dealer',     label: 'Dealer',     icon: 'store' },
            { id: 'expert-hub', label: 'Expert Hub', icon: 'shield' },
            { id: 'crm',        label: 'CRM',        icon: 'users' },
        ],
    },
    {
        id: 'acme',
        title: 'Dealer RFQ → PO',
        subtitle: 'Dealer Rust · Furniture dealer flow (Dealer Sage legacy sin CRM steps)',
        name: 'Dealer Rust',
        companyName: 'Dealer Rust',
        description: 'Furniture dealer experience',
        icon: '🏭',
        defaultApp: 'email-marketplace',
        experienceKind: 'tour-profile',
        maturity: 'demo',
        parentExperience: 'expert-hub',
        sourceLabel: 'Acme · Expert Hub tour (COI legacy sin CRM)',
        // F78.k · Diego 2026-08-18 · ver COI arriba · mismo motivo
        // (hideChrome + autoStart · sin controles al arrancar).
        lastUpdated: '2026-01-10',
        // F45.a · Diego 2026-07-29 · Dealer Rust hereda el patrón F44 de
        // Dealer Sage · auto-arranca el demo al aterrizar + esconde el tour
        // scaffolding · content-only mode. Preserva la identidad legacy
        // (COI_STEPS · 23 steps sin CRM steps) pero con la UX moderna.
        autoStart: true,
        hideChrome: true,
        steps: COI_STEPS,
        stepBehavior: COI_STEP_BEHAVIOR,
        stepMessages: COI_STEP_MESSAGES,
        selfIndicatedSteps: COI_SELF_INDICATED,
        hasRoleSwitcher: true,
        defaultRoleId: 'dealer',
        roles: [
            { id: 'dealer',     label: 'Dealer',     icon: 'store' },
            { id: 'expert-hub', label: 'Expert Hub', icon: 'shield' },
        ],
    },
];
