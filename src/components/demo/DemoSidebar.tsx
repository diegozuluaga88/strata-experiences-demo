import React from 'react';
import { useDemo } from '../../context/DemoContext';
import { useTheme } from 'strata-design-system';
import {
    CheckCircle2,
    Circle,
    ChevronRight,
    ChevronLeft,
    Play,
    Pause,
    Loader2,
    Star,
} from 'lucide-react';

// Hero moments — emotional peak beats per profile. Surfaced in the sidebar
// with a star marker so the audience knows which beats are the demo's
// crescendo and the presenter doesn't accidentally rush past them.
//
// Apr 27: m4.3 (Spec Check finding) was a hero, but Design AI was removed
// from the active tour (Matt: "primary and only necessary is accounting").
// MBIDesignPage stays navigable via tab so anyone can still see that scene
// — but it's not in the guided tour so no sidebar marker.
const HERO_STEP_IDS = new Set<string>([
    'm2.2',  // MBI · HealthTrust GPO 3% rebate modal — the most interactive AP scene
]);
import { useDemoProfile } from '../../context/useDemoProfile';
import { WORKSPACES_DATA_THREADS } from '../../config/profiles/workspaces';

// Apps belonging to Expert Hub — System steps in these show as "Expert"
const EXPERT_HUB_APPS = ['expert-hub', 'ack-detail', 'transactions', 'mac', 'quote-detail'];

function resolveRoleLabel(role: string, app: string, profileId?: string): string {
    if (role === 'System') {
        // Continua & Dupler: all System steps are AI processing within Expert context
        if (profileId === 'continua' || profileId === 'dupler') return 'Expert';
        return EXPERT_HUB_APPS.includes(app) ? 'Expert' : 'Dealer';
    }
    return role;
}

// Data threads — mini-summaries for completed steps, keyed by profile ID
const DATA_THREADS_BY_PROFILE: Record<string, Record<string, string>> = {
    continua: {
        '1.1': 'Health score 87% — 3 alerts',
        '1.2': '12 items cataloged for reuse',
        '1.3': 'Price verified — $110K savings',
        '1.4': '4 locations synced',
        '1.5': '4 RMA, 4 convert-to-purchase',
        '1.6': 'Report approved — all changes confirmed',
        '3.1': 'Project request submitted — $3.2M, 8 floors',
        '3.2': '3 POs generated, $3.2M',
        '3.3': 'PO-to-ACK conversion verified',
        '3.4': 'Approval chain completed — 3/3 approved',
        '3.5': 'QC passed — 1,320 items received',
        '3.6': 'Installation dispatched — 8 floors',
        '2.1': 'REQ-FM-2026-018 — safety flag',
        '2.2': 'Warranty + consignment + relocation plan',
        '2.3': 'Dispatch approved — ProInstall tomorrow',
        '2.4': 'Assets relocated to Office 3-216',
        '2.5': 'Resolved — $0 cost, 26h total',
        '4.1': '194 tons diverted, A- rating',
        '4.2': 'Portal published — 82% progress',
        '4.3': '$11,550 reconciled',
        '4.4': '92% satisfaction, AV flagged',
    },
    dupler: {
        'd1.1': 'Gap detected — vendor PDF imported, products extracted and mapped',
        'd1.2': 'Flagged items resolved — AI suggestions and specialist review',
        'd1.3': 'PMX specification assembled — sent to SC, catalog synchronized',
        'd1.4': 'Upcharges validated — discounts applied by SC',
        'd1.5': 'Priced SIF generated — synchronized and sent for approval',
        'd2.1': 'Warehouse scanned — aging items flagged, moves recommended',
        'd2.2': 'Items received — exceptions flagged and assessed',
        'd2.3': 'Prices verified — margin alerts reviewed',
        'd2.4': 'Warehouses synced — routes optimized',
        'd2.5': 'Shipments tracked — delays predicted, freight audited',
        'd2.6': 'Claims processed — credits and warranties reviewed',
        'd2.7': 'Dealer approved — dispatch scheduled',
        'd3.1': 'All systems connected — inventory health scored',
        'd3.2': 'Updates verified and propagated — metrics configured',
        'd3.3': 'Report assembled — previewed and sent to team',
        'd3.4': 'Report reviewed — client portal live',
    },
    wrg: {
        'w1.1': 'Client request received — attachments identified',
        'w1.2': 'Mismatches found — flagged items sent to designer',
        'w1.3': 'Designer reviewed fields — corrections submitted',
        'w1.4': 'Project registered — expert assigned',
        'w1.5': 'Intake approved — estimation phase authorized',
        'w2.1': '24 items costed — 5 flagged, OFS Serpentine escalated to designer',
        'w2.2': '5 modules validated — verification report sent to expert',
        'w2.3': 'All adjustments resolved — proposal assembled ($202,138)',
        'w2.4': 'Proposal approved and released to client — 92% time saved',
    },
    workspaces: WORKSPACES_DATA_THREADS,
    bfi: {
        'a1.1':  'DOE-2847 flagged · CPR discrepancy detected',
        'a1.2':  'SIF corrected · 1 price adjusted · discount calculated',
        'a1.2b': 'Order Q-2026-0089 confirmed · Account Manager Bly acknowledged',
        'a1.2c': 'PO + labor captured · CORE entry confirmed · EDI transmitted',
        'a1.2d': 'Proposal sent to DOE · WIG report received · packing list ready for AI',
        'a1.2e': 'Lena notified Lauren · carton #34 (M-ARM) missing · claim filed with Herman Miller',
        'a1.2f': 'Claim resolved · HM confirmed replacement · Walter notified · work order cleared',
        'a1.3':  'CPR approved · −$2,340 applied · relayed to Nancy Bos',
        'a1.4':  'Agency fee verified · $41,040 match confirmed',
        'r1.2':  'WIG report received · packing list ready for AI',
        'r1.3':  'Carton #34 missing · 1 discrepancy in 10 seconds',
        'r1.4':  'Andy notified · Omni claim #OM-2026-0412 filed',
        'r1.5':  '34/35 confirmed in CORE · Line 24 excluded',
        'r1.6':  'Walter notified · crew scheduling initiated',
    },
    leland: {
        'l0.1': 'Inbox set · the manual baseline',
        'l1.1': 'PO captured · ready for the next check',
        'l1.2': 'Matching quote found',
        'l1.3': 'Price difference caught · sent for review',
        'l1.4': 'Reviewer approved · Strata resumes',
        'l1.5': 'Customer · materials · configuration validated',
        'l1.6': 'Sales order built',
        'l1.7': 'Comments · metadata · rebate applied',
        'l1.8': 'Order logged · ticket closed',
        'l2.1': 'One catch · meaningful annual savings',
    },
};

function getStepDataThread(stepId: string, profileId: string): string | null {
    const threads = DATA_THREADS_BY_PROFILE[profileId];
    return threads?.[stepId] || null;
}

export default function DemoSidebar() {
    const { currentStepIndex, steps, nextStep, prevStep, goToStep, isDemoActive, setIsDemoActive, isSidebarCollapsed, setIsSidebarCollapsed, isPaused, togglePause } = useDemo();
    const { activeProfile } = useDemoProfile();
    const { theme } = useTheme();
    const STEP_BEHAVIOR = activeProfile.stepBehavior;
    const isContinua = activeProfile.id === 'continua';
    const isDupler = activeProfile.id === 'dupler';
    const isWRG = activeProfile.id === 'wrg';
    const isLeland = activeProfile.id === 'leland';
    const isWorkspaces = activeProfile.id === 'workspaces';
    const isBFI = activeProfile.id === 'bfi';
    const hasDataThreads = isContinua || isDupler || isWRG || isLeland || isWorkspaces || isBFI;

    // Invert: when app is dark → sidebar is light, when app is light → sidebar is dark
    const isDarkSidebar = theme === 'light';

    // Color tokens based on inverted theme
    const c = isDarkSidebar ? {
        // Dark sidebar (app is in light mode)
        bg: 'bg-zinc-950',
        bgHeader: 'bg-zinc-900',
        bgStep: 'bg-zinc-900/60',
        bgStepActive: 'bg-zinc-800',
        bgBadge: 'bg-zinc-800',
        bgBadgeActive: 'bg-zinc-700',
        bgBtn: 'bg-zinc-800',
        bgBtnHover: 'hover:bg-zinc-700',
        bgNext: 'bg-white',
        bgNextHover: 'hover:bg-zinc-200',
        textNext: 'text-zinc-950',
        border: 'border-zinc-800',
        borderSubtle: 'border-zinc-800/50',
        textTitle: 'text-white',
        textBody: 'text-zinc-300',
        textMuted: 'text-muted-foreground',
        textDim: 'text-muted-foreground',
        textBadge: 'text-muted-foreground',
        textBadgeActive: 'text-zinc-200',
        textBtn: 'text-zinc-300',
        iconDone: 'text-success',
        iconDoneFill: 'fill-emerald-400/10',
        iconActive: 'border-white bg-zinc-900',
        iconActiveDot: 'bg-white',
        iconPending: 'text-muted-foreground',
        connectorDone: 'bg-success/40',
        connectorPending: 'bg-zinc-800',
        activeBorder: 'border-l-white/70',
        dealerBadge: 'border-blue-800/50 bg-blue-900/30 text-info',
        fmBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        fuBadge: 'border-amber-800/50 bg-amber-900/30 text-warning',
        expertBadge: 'border-purple-800/50 bg-purple-900/30 text-purple-400',
        scBadge: 'border-indigo-800/50 bg-indigo-900/30 text-indigo-400',
        estimatorBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        designerBadge: 'border-sky-800/50 bg-sky-900/30 text-sky-400',
        endUserBadge: 'border-rose-800/50 bg-rose-900/30 text-rose-400',
        employeeBadge: 'border-emerald-800/50 bg-emerald-900/30 text-success',
        opsMgrBadge: 'border-blue-800/50 bg-blue-900/30 text-info',
        apCoordBadge: 'border-violet-800/50 bg-violet-900/30 text-ai',
        cfoBadge: 'border-amber-800/50 bg-amber-900/30 text-warning',
        accountLeadBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        projectMgrBadge: 'border-violet-800/50 bg-violet-900/30 text-ai',
        financeArBadge: 'border-amber-800/50 bg-amber-900/30 text-warning',
        collapsedBg: 'bg-zinc-950',
        collapsedText: 'text-muted-foreground',
        collapsedBorder: 'border-zinc-800/50',
        fab: 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800',
    } : {
        // Light sidebar (app is in dark mode)
        bg: 'bg-white',
        bgHeader: 'bg-muted',
        bgStep: 'bg-muted/60',
        bgStepActive: 'bg-zinc-100',
        bgBadge: 'bg-zinc-100',
        bgBadgeActive: 'bg-zinc-200',
        bgBtn: 'bg-zinc-100',
        bgBtnHover: 'hover:bg-zinc-200',
        bgNext: 'bg-zinc-900',
        bgNextHover: 'hover:bg-zinc-800',
        textNext: 'text-white',
        border: 'border-zinc-200',
        borderSubtle: 'border-zinc-200/80',
        textTitle: 'text-zinc-900',
        textBody: 'text-muted-foreground',
        textMuted: 'text-muted-foreground',
        textDim: 'text-muted-foreground',
        textBadge: 'text-muted-foreground',
        textBadgeActive: 'text-zinc-800',
        textBtn: 'text-muted-foreground',
        iconDone: 'text-success',
        iconDoneFill: 'fill-emerald-600/10',
        iconActive: 'border-zinc-900 bg-white',
        iconActiveDot: 'bg-zinc-900',
        iconPending: 'text-zinc-300',
        connectorDone: 'bg-success/40',
        connectorPending: 'bg-zinc-200',
        activeBorder: 'border-l-zinc-900',
        dealerBadge: 'border-info/30 bg-info/10 text-info',
        fmBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        fuBadge: 'border-warning/30 bg-warning/10 text-warning',
        expertBadge: 'border-purple-200 bg-purple-50 text-purple-700',
        scBadge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        estimatorBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        designerBadge: 'border-sky-200 bg-sky-50 text-sky-700',
        endUserBadge: 'border-rose-200 bg-rose-50 text-rose-700',
        employeeBadge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        opsMgrBadge: 'border-info/30 bg-info/10 text-info',
        apCoordBadge: 'border-violet-200 bg-violet-50 text-violet-700',
        cfoBadge: 'border-warning/30 bg-warning/10 text-warning',
        accountLeadBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        projectMgrBadge: 'border-violet-200 bg-violet-50 text-violet-700',
        financeArBadge: 'border-warning/30 bg-warning/10 text-warning',
        collapsedBg: 'bg-white',
        collapsedText: 'text-muted-foreground',
        collapsedBorder: 'border-zinc-200',
        fab: 'bg-white text-zinc-900 border-zinc-200 hover:bg-muted',
    };

    if (!isDemoActive) {
        // Hide the Demo FAB entirely on profiles that don't have a guided
        // tour flow · Inbound|Outbound (P25) + F78.i · production experiences
        // Expert Hub + Quote Converter (Diego 2026-08-18 · son apps prod
        // renderizadas directamente · no tienen steps).
        if (
            activeProfile.id === 'inbound-outbound' ||
            activeProfile.id === 'expert-hub' ||
            activeProfile.id === 'quote-converter'
        ) return null;
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsDemoActive(true)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg border transition-all font-semibold ${c.fab}`}
                >
                    <Play size={20} fill="currentColor" />
                    <span>Demo</span>
                </button>
            </div>
        );
    }

    if (isSidebarCollapsed) {
        return (
            <div className="fixed left-0 top-32 z-[300]">
                <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-r-xl border border-l-0 shadow-2xl transition-all group w-12 ${c.collapsedBg} ${c.collapsedText} ${c.collapsedBorder} hover:opacity-80`}
                >
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Demo</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed left-0 top-0 h-full w-80 ${c.bg} border-r ${c.borderSubtle} z-[300] flex flex-col shadow-2xl transition-all duration-300`}>
            {/* Header */}
            <div className={`p-6 border-b ${c.border} ${c.bgHeader}`}>
                <div className="flex items-center justify-between mb-1">
                    <h2 className={`text-lg font-bold ${c.textTitle}`}>Demo Flow</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarCollapsed(true)}
                            className={`p-1 rounded-md ${c.textMuted} hover:opacity-70 transition-colors`}
                            title="Collapse"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setIsDemoActive(false)}
                            className={`${c.textMuted} hover:opacity-70 text-xs uppercase tracking-wider font-semibold ml-1 transition-colors`}
                        >
                            Exit
                        </button>
                    </div>
                </div>
                <p className={`text-xs ${c.textDim}`}>Guided Experience Simulation</p>
            </div>

            {/* Steps List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 pt-6 scrollbar-micro">
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    const showGroupHeader = index === 0 || steps[index - 1].groupId !== step.groupId;
                    // Compute sequential display number from group position
                    const groupIds = [...new Set(steps.map(s => s.groupId))];
                    const groupSteps = steps.filter(s => s.groupId === step.groupId);
                    const posInGroup = groupSteps.findIndex(s => s.id === step.id);
                    const groupDisplayNum = groupIds.indexOf(step.groupId) + 1;
                    const displayNumber = `${groupDisplayNum}.${posInGroup + 1}`;

                    return (
                        <React.Fragment key={step.id}>
                            {showGroupHeader && (
                                <div className="pt-4 pb-2 first:pt-0">
                                    <h3 className={`text-[10px] font-bold ${c.textDim} uppercase tracking-widest`}>{step.groupTitle}</h3>
                                </div>
                            )}
                            <div
                                onClick={() => goToStep(index)}
                                className={`relative flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${isActive ? `${c.bgStepActive} border-l-2 ${c.activeBorder}` : 'hover:opacity-80'}`}
                            >
                                {/* Connector Line */}
                                {index < steps.length - 1 && steps[index + 1].groupId === step.groupId && (
                                    <div className={`absolute left-[22px] top-11 w-0.5 h-8 ${isCompleted ? c.connectorDone : c.connectorPending}`} />
                                )}

                                {/* Icon / Status */}
                                <div className="z-10 mt-0.5 shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 size={20} className={`${c.iconDone} ${c.iconDoneFill}`} />
                                    ) : isActive ? (
                                        <div className={`w-5 h-5 rounded-full border-2 ${c.iconActive} flex items-center justify-center`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.iconActiveDot}`} />
                                        </div>
                                    ) : (
                                        <Circle size={20} className={c.iconPending} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? `${c.bgBadgeActive} ${c.textBadgeActive}` : `${c.bgBadge} ${c.textBadge}`}`}>
                                            STEP {displayNumber}
                                        </span>
                                        {(() => {
                                            const label = resolveRoleLabel(step.role, step.app, activeProfile.id);
                                            return (
                                                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border ${label === 'Facility Manager' ? c.fmBadge : label === 'Facility User' ? c.fuBadge : label === 'Dealer' ? c.dealerBadge : label === 'End User' ? c.endUserBadge : label === 'Sales Coordinator' ? c.scBadge : label === 'Estimator' ? c.estimatorBadge : label === 'Designer' ? c.designerBadge : label === 'Employee' ? c.employeeBadge : label === 'Operations Manager' ? c.opsMgrBadge : label === 'AP Coordinator' ? c.apCoordBadge : label === 'CFO' ? c.cfoBadge : label === 'Account Manager' ? c.accountLeadBadge : label === 'Project Manager' ? c.projectMgrBadge : label === 'Finance / AR' ? c.financeArBadge : label === 'System' ? c.expertBadge : c.expertBadge}`}>
                                                    {label === 'Facility Manager' ? 'FACILITY MANAGER' : label === 'Facility User' ? 'FACILITY USER' : label}
                                                </span>
                                            );
                                        })()}
                                        {STEP_BEHAVIOR[step.id]?.mode === 'auto' && (
                                            <span className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 ${isActive ? `${c.bgBadgeActive} ${c.textBadgeActive}` : `${c.bgBadge} ${c.textBadge}`}`}>
                                                <Loader2 size={8} className={isActive ? 'animate-spin' : ''} />
                                                AUTO
                                            </span>
                                        )}
                                        {HERO_STEP_IDS.has(step.id) && (
                                            <span
                                                className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 font-bold uppercase tracking-wider ${
                                                    isActive
                                                        ? 'bg-warning/30 text-warning'
                                                        : 'bg-warning/10 text-warning'
                                                }`}
                                                title="Hero moment — the demo's emotional peak"
                                            >
                                                <Star size={8} className="fill-current" />
                                                HERO
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={`font-semibold text-sm leading-tight ${isActive ? c.textTitle : c.textBody}`}>
                                        {step.title}
                                    </h3>
                                    {isActive && (
                                        <p className={`text-[11px] ${c.textMuted} leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300`}>
                                            {step.description}
                                        </p>
                                    )}
                                    {isCompleted && hasDataThreads && getStepDataThread(step.id, activeProfile.id) && (
                                        <p className={`text-[8px] italic ${c.textDim} leading-tight`}>
                                            → {getStepDataThread(step.id, activeProfile.id)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Paused Indicator */}
            {isPaused && (
                <div className={`mx-4 mb-2 flex items-center justify-center gap-2 py-2 rounded-lg border ${isDarkSidebar ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-warning/10 border-warning/30 text-warning'} animate-pulse`}>
                    <Pause size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Paused</span>
                </div>
            )}

            {/* Navigation Controls */}
            <div className={`p-4 border-t ${c.border} ${c.bgHeader}`}>
                <div className="flex gap-2">
                    <button
                        onClick={prevStep}
                        disabled={currentStepIndex === 0}
                        className={`flex-1 flex items-center justify-center gap-1.5 ${c.bgBtn} ${c.textBtn} py-2 rounded-lg text-sm font-semibold disabled:opacity-40 ${c.bgBtnHover} transition-colors`}
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>
                    <button
                        onClick={togglePause}
                        className={`flex items-center justify-center w-10 rounded-lg text-sm font-semibold transition-colors ${isPaused
                            ? (isDarkSidebar ? 'bg-warning/20 text-warning hover:bg-warning/30' : 'bg-warning/15 text-warning hover:bg-warning/20')
                            : `${c.bgBtn} ${c.textBtn} ${c.bgBtnHover}`
                        }`}
                        title={isPaused ? 'Resume' : 'Pause'}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                        onClick={nextStep}
                        disabled={currentStepIndex === steps.length - 1}
                        className={`flex-[1.5] flex items-center justify-center gap-1.5 ${c.bgNext} ${c.textNext} py-2 rounded-lg text-sm font-semibold disabled:opacity-40 ${c.bgNextHover} transition-colors shadow-sm`}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
