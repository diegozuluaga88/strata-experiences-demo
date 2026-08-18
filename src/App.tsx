import { useState, useEffect } from 'react'
import { GenUIProvider } from './context/GenUIContext'
import { useAuth } from './context/AuthContext'
import { useDemo } from './context/DemoContext'
import { useDemoProfile } from './context/useDemoProfile'
import type { SimulationApp } from './config/demoProfiles'
import Login from "./Login"
import Dashboard from "./Dashboard"
import Detail from "./Detail"
import QuoteDetail from "./QuoteDetail"
import OrderDetail from "./OrderDetail"
import AckDetail from "./AckDetail"
import Workspace from "./Workspace"
import Inventory from "./Inventory"
import Catalogs from "./Catalogs"
import MAC from "./MAC"
import Transactions from "./Transactions"
import CRM from "./CRM"
import Pricing from "./Pricing"
import Shipping from "./Shipping"
import QuoteConverter from "./QuoteConverter"
import ExpertHubTransactionsWrapper from "./blocks/prod-imports/wrappers/ExpertHubTransactionsWrapper"
import RoleSwitchToast from "./components/manufacturer/RoleSwitchToast"
import Navbar from "./components/Navbar"
import DemoGuide from "./components/DemoGuide"
import SessionExpiryModal from "./components/SessionExpiryModal"
import DemoSidebar from "./components/demo/DemoSidebar"
import DemoSpotlight from "./components/demo/DemoSpotlight"
import DemoProcessPanel from "./components/demo/DemoProcessPanel"
import DemoStepBanner from "./components/demo/DemoStepBanner"
import DemoAIIndicator from "./components/demo/DemoAIIndicator"
import StrataArchitectureSlide from "./components/demo/StrataArchitectureSlide"

// Simulations
import ExpertHubTransactions from "./components/simulations/ExpertHubTransactions"
import EmailSimulation from "./components/simulations/EmailSimulation"
import DealerMonitorKanban from "./components/simulations/DealerMonitorKanban"
import ServiceNowSimulation from "./components/simulations/ServiceNowSimulation"
import SpecializedCatalog from "./components/simulations/SpecializedCatalog"
import ConversationalSurvey from "./components/simulations/ConversationalSurvey"
import CRMSimulation from "./components/simulations/CRMSimulation"
import DuplerPdfProcessor from "./components/simulations/DuplerPdfProcessor"
import DuplerWarehouse from "./components/simulations/DuplerWarehouse"
// WRG Demo v6 — Strata Estimator (Opción F: Collaborative Single-Shell)
import { StrataEstimatorShell } from "./features/strata-estimator"
// DuplerReporting now renders inside Dashboard.tsx (Follow Up notification + Metrics processing)

// MBI Demo — 5 page stubs (Phase 0.D · expanded in Phases 1-5)
import MBIOverviewPage from "./components/mbi/MBIOverviewPage"
import MBIBudgetPage from "./components/mbi/MBIBudgetPage"
import MBIAccountingPage from "./components/mbi/MBIAccountingPage"
import MBIQuotesPage from "./components/mbi/MBIQuotesPage"
import MBIDesignPage from "./components/mbi/MBIDesignPage"
import BFIPage, { BFIDashboardPage } from "./components/bfi/BFIPage"
import WorkspacesPage from "./components/workspaces/WorkspacesPage"
import OfficeworksPage, { OfficeworksDashboardPage } from "./components/officeworks/OfficeworksPage"
import CLCPage, { CLCDashboardPage } from "./components/clc/CLCPage"
import SharedBlockShell from "./components/SharedBlockShell"
import { findSharedBlock } from "./config/sharedBlocks"
import { Calculator as CalculatorIcon, Receipt as ReceiptIcon, FileSearch as FileSearchIcon, Palette as PaletteIcon, Sparkles as SparklesIcon, Mail as MailIcon, Database as DatabaseIcon, ShieldCheck as ShieldCheckIcon, Building2 as Building2Icon, LayoutDashboard as LayoutDashboardIcon, Inbox as InboxIcon, Pencil as PencilIcon, ClipboardCheck as ClipboardCheckIcon, Send as SendIcon, Calendar as CalendarIcon, Folder as FolderIcon, ClipboardList as ClipboardListIcon } from 'lucide-react'

// Leland Demo — 4 app shells (Phase L0 · expanded in L1-L5)
import { LelandStrataShell, LelandInboxApp, LelandSeradexApp, LelandReviewQueueApp } from "./features/leland"

import {
  HomeIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

import logoLightBrand from './assets/logo-light-brand.png'
import logoDarkBrand from './assets/logo-dark-brand.png'

function App() {
  const { user, initialLoading, signOut, showSessionWarning, refreshSession } = useAuth()
  const { isDemoActive, currentStep, isSidebarCollapsed, steps, goToStep } = useDemo()
  const { activeProfile: demoProfile } = useDemoProfile()
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'detail' | 'quote-detail' | 'order-detail' | 'ack-detail' | 'ack-detail-ai' | 'workspace' | 'inventory' | 'catalogs' | 'mac' | 'transactions' | 'crm' | 'pricing' | 'shipping' | 'quote-converter'>('transactions')
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false)
  const [showArchSlide, setShowArchSlide] = useState(false)
  const [bfiLoginActive, setBfiLoginActive] = useState(false)
  const [bfiDashboardActive, setBfiDashboardActive] = useState(false)
  const [officeworksDashboardActive, setOfficeworksDashboardActive] = useState(false)

  // When the user clicks a custom nav tab (leland-strata, bfi-agency-fee, etc.)
  // WITHOUT the demo tour active, we render that app directly instead of
  // silently failing (previous behavior was goToStep(-1) → no-op).
  // Reset whenever the profile changes or the tour goes active.
  const [currentAppOverride, setCurrentAppOverride] = useState<SimulationApp | null>(null)

  // Shared building blocks / widgets · surfaced via `?block=<id>` in the URL.
  // When set, the app skips the normal experience shell and renders only the
  // block preview via <SharedBlockShell>. See src/config/sharedBlocks.ts.
  const [blockId, setBlockId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('block') : null
  )
  useEffect(() => {
    const sync = () => setBlockId(new URLSearchParams(window.location.search).get('block'))
    window.addEventListener('popstate', sync)
    window.addEventListener('block:change', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('block:change', sync)
    }
  }, [])
  const handleExitBlock = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('block')
    window.history.pushState({}, '', url.toString())
    setBlockId(null)
  }

  // Browser tab title — adapts to active profile (e.g., "Manufacturer Experience · Inbound | Outbound")
  useEffect(() => {
    const label = demoProfile.experienceLabel ?? 'Dealer Experience'
    document.title = `${label} · ${demoProfile.companyName}`
  }, [demoProfile.experienceLabel, demoProfile.companyName])

  // Set initial page for CRM steps
  useEffect(() => {
    if (isDemoActive && currentStep?.app === 'crm') {
      setCurrentPage(currentStep.id === '1.12' ? 'dashboard' : 'crm')
    }
  }, [isDemoActive, currentStep?.app, currentStep?.id])

  // F44.b.2 (Diego 2026-07-29) · scroll-to-top on demo step change.
  // Necesario porque varios steps del Dashboard usan `min-h-[200vh]` para
  // mobile phone frame simulations. Sin scroll reset, después de step 1.6
  // (Approval Chain corto) el user avanza a 1.7/1.8 pero mantiene su scroll
  // position → ve la zona negra bg-zinc-950 debajo del phone frame en vez
  // del content en el top. También ayuda a otros steps largos.
  useEffect(() => {
    if (isDemoActive) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep?.id, isDemoActive])

  // Reset in-demo detail navigation when step changes
  useEffect(() => {
    if (isDemoActive && (currentPage === 'order-detail' || currentPage === 'quote-detail' || currentPage === 'ack-detail')) {
      setCurrentPage('transactions')
    }
  }, [currentStep?.id])

  // Reset BFI dashboard mode when any demo step advances
  useEffect(() => {
    if (bfiDashboardActive) setBfiDashboardActive(false)
  }, [currentStep?.id])

  // Reset Officeworks dashboard mode when any demo step advances
  useEffect(() => {
    if (officeworksDashboardActive) setOfficeworksDashboardActive(false)
  }, [currentStep?.id])

  // Clear the app override whenever the profile changes or the tour goes
  // active (tour drives its own currentStep.app).
  useEffect(() => {
    setCurrentAppOverride(null)
  }, [demoProfile.id, isDemoActive])

  // Custom-prefix nav tabs that map to a SimulationApp when clicked outside
  // the tour. Kept as a static list so handleNavigate can decide whether to
  // (a) jump to the matching tour step if the tour is active, or (b) set
  // the app override if the tour is idle.
  const CUSTOM_APP_PREFIXES = ['mbi-', 'leland-', 'bfi-', 'officeworks-', 'workspaces-', 'clc-', 'dupler-', 'wrg-'] as const

  const handleNavigate = (page: string) => {
    if (page === 'overview') {
      setCurrentPage('dashboard')
    } else if (page === 'bfi-dashboard') {
      // BFI Dashboard is a permanent page — not a demo step
      setBfiDashboardActive(true)
    } else if (page === 'officeworks-dashboard') {
      // Officeworks Dashboard is a permanent page — not a demo step
      setOfficeworksDashboardActive(true)
    } else if (CUSTOM_APP_PREFIXES.some(pref => page.startsWith(pref))) {
      // Custom-app tabs · during tour, jump to the matching step.
      // Outside the tour, set the app override so renderCurrentPage
      // delegates to renderApp(page).
      setBfiDashboardActive(false)
      setOfficeworksDashboardActive(false)
      if (isDemoActive) {
        const idx = steps.findIndex(s => s.app === page)
        if (idx >= 0) goToStep(idx)
      } else {
        setCurrentAppOverride(page as SimulationApp)
      }
    } else {
      // @ts-ignore
      setCurrentPage(page)
      setCurrentAppOverride(null)
    }
  }

  // ORD-2056 delayed shipment scenario · ActionCenter / Dashboard CTAs dispatch a 'demo:navigate' event to jump pages.
  useEffect(() => {
    const onNavEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { page?: string } | undefined
      if (detail?.page) handleNavigate(detail.page)
    }
    window.addEventListener('demo:navigate', onNavEvent)
    return () => window.removeEventListener('demo:navigate', onNavEvent)
  }, [])

  const handleLogout = async () => {
    await signOut()
    setCurrentPage('dashboard')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={logoLightBrand} alt="Strata" className="h-16 w-auto block dark:hidden" />
          <img src={logoDarkBrand} alt="Strata" className="h-16 w-auto hidden dark:block" />
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // If the URL carries `?block=<id>`, render the shared block preview in
  // isolation — no tour, no per-profile navigation, no role switcher.
  // Wrapped in GenUIProvider because some blocks (Dashboard, Transactions,
  // SmartQuoteHub) consume useGenUI internally.
  const activeBlock = findSharedBlock(blockId)
  if (activeBlock) {
    return (
      <GenUIProvider onNavigate={handleNavigate}>
        <SharedBlockShell block={activeBlock} onExit={handleExitBlock} onLogout={handleLogout} />
      </GenUIProvider>
    )
  }

  // --- SIMULATION CONFIGURATIONS ---
  const isContinua = demoProfile.id === 'continua';
  const isDupler = demoProfile.id === 'dupler';
  const isWRG = demoProfile.id === 'wrg';
  const isMBI = demoProfile.id === 'mbi';
  const isLeland = demoProfile.id === 'leland';
  const isBFI = demoProfile.id === 'bfi';
  const isWorkspaces = demoProfile.id === 'workspaces';
  const isOfficeworks = demoProfile.id === 'officeworks';
  const isCLC = demoProfile.id === 'clc';
  const isInboundOutbound = demoProfile.id === 'inbound-outbound';

  // Pages hidden for inbound-outbound profile (manufacturer scope only).
  // Per Liliana team review: CRM placeholder + dealer-side widgets out of scope.
  const inboundOutboundHiddenPages = ['crm', 'inventory', 'catalogs', 'pricing', 'workspace'];

  // Per-profile nav definitions · extracted so they render regardless of
  // whether the guided tour is active. Users can now browse a profile's
  // tabs immediately after picking it from the dropdown — no need to
  // launch the tour first.
  const continuaNav = [
    { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
    { name: 'Inventory', page: 'inventory', icon: ArchiveBoxIcon, badge: 'Connected' },
    { name: 'Service Center', page: 'mac', icon: WrenchScrewdriverIcon },
    { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
  ];
  const expertNav = [
    { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
    { name: 'Service Center', page: 'mac', icon: WrenchScrewdriverIcon },
    { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
  ];
  const crmNav = [
    { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
    { name: 'CRM', page: 'crm', icon: UserGroupIcon },
    { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
  ];
  const duplerNav = [
    { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
    { name: 'Inventory', page: 'inventory', icon: ArchiveBoxIcon },
    { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
  ];
  const wrgNav: { name: string; page: string; icon: any; badge?: string }[] = [];
  // MBI · 2 tabs (Design AI + Budget Builder kept in codebase but not in nav).
  const mbiNav = [
    { name: 'Accounting AI', page: 'mbi-accounting', icon: ReceiptIcon },
    { name: 'Quotes AI', page: 'mbi-quotes', icon: FileSearchIcon },
  ];
  const lelandNav = [
    { name: 'PO Workspace', page: 'leland-strata', icon: SparklesIcon },
    { name: 'Inbox', page: 'leland-inbox', icon: MailIcon },
    { name: 'Order System', page: 'leland-seradex', icon: DatabaseIcon },
    { name: 'Review Queue', page: 'leland-review', icon: ShieldCheckIcon },
  ];
  const bfiNav = [
    { name: 'Dashboard', page: 'bfi-dashboard', icon: LayoutDashboardIcon },
    { name: 'Agency Fee AI', page: 'bfi-agency-fee', icon: Building2Icon },
    { name: 'Receiving AI', page: 'bfi-receiving', icon: ReceiptIcon },
  ];
  const workspacesNav = [
    { name: 'Expense Submission', page: 'workspaces-submit', icon: ReceiptIcon },
    { name: 'AP & Reporting', page: 'workspaces-ap', icon: Building2Icon },
    { name: 'Spend Dashboard', page: 'workspaces-reporting', icon: LayoutDashboardIcon },
  ];
  // F22 · Spec Check AI removed · será feature module aparte.
  // F25 · Labor & Delivery + Sales AI removed (2026-07-23) · el nav
  // Officeworks era outlier (6 tabs vs 3-4 en el resto) y saturaba
  // el pill del navbar solapándose con el RoleSwitcher. Los apps
  // 'officeworks-labor' y 'officeworks-sales' siguen registrados en
  // renderCurrentPage / renderSimulation porque los steps sc-LD.* y
  // sc-S.* del tour los rutean directamente por app id, sin depender
  // del nav.
  const officeworksNav = [
    { name: 'Dashboard', page: 'officeworks-dashboard', icon: LayoutDashboardIcon },
    { name: 'Intake AI', page: 'officeworks-intake', icon: InboxIcon },
    { name: 'Design AI', page: 'officeworks-design', icon: PencilIcon },
    { name: 'Submission AI', page: 'officeworks-submission', icon: SendIcon },
  ];
  const clcNav = [
    { name: 'Schedule AI', page: 'clc-calendar', icon: CalendarIcon },
    { name: 'Asset Seeding AI', page: 'clc-sharepoint', icon: FolderIcon },
    { name: 'Intake Validation', page: 'clc-intake', icon: ClipboardListIcon },
    { name: 'Operations Dashboard', page: 'clc-dashboard', icon: LayoutDashboardIcon },
  ];
  const inboundOutboundNav = [
    { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
    { name: 'Quote Converter', page: 'quote-converter', icon: ArrowsRightLeftIcon },
    { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
    { name: 'Service Center', page: 'mac', icon: WrenchScrewdriverIcon },
  ];

  // Pick the nav for the active profile (works with or without demo tour).
  const profileNav =
    isCLC ? clcNav
    : isOfficeworks ? officeworksNav
    : isWorkspaces ? workspacesNav
    : isBFI ? bfiNav
    : isLeland ? lelandNav
    : isMBI ? mbiNav
    : isWRG ? wrgNav
    : isDupler ? duplerNav
    : isContinua ? continuaNav
    : isInboundOutbound ? inboundOutboundNav
    : expertNav;

  const getSimulationConfig = () => {
    // Without an active demo tour, just return the profile's nav plus
    // undefined app/company (Navbar falls back to profile defaults).
    if (!isDemoActive) {
      return {
        appName: undefined,
        companyName: undefined,
        customNavigation: profileNav,
      };
    }

    // Standardized app names and company per role
    const isExpert = ['expert-hub', 'dealer-kanban', 'ack-detail', 'transactions', 'mac', 'quote-detail'].includes(currentStep.app);

    // Continua: resolve appName by role (not app) for consistency
    const continuaAppName = currentStep.role === 'Expert' || currentStep.role === 'System' ? 'Expert Hub'
      : currentStep.role === 'Facility Manager' ? 'Facility Manager'
      : currentStep.role === 'Facility User' ? 'Facility User'
      : 'Expert Hub';
    const continuaCompany = currentStep.role === 'Expert' || currentStep.role === 'System' ? 'Strata Services'
      : demoProfile.companyName;

    const isDuplerExpert = isDupler && (currentStep.role === 'Expert' || currentStep.role === 'System');
    const isDuplerDealer = isDupler && currentStep.role === 'Dealer';
    const isWrgDealer = isWRG && currentStep.role === 'Dealer';
    const isWrgExpert = isWRG && currentStep.role === 'Expert';
    const isWrgDesigner = isWRG && currentStep.role === 'Designer';

    // Leland — appName follows the app's purpose; company switches by role.
    const lelandAppName = currentStep.app === 'leland-inbox' ? 'Inbox'
      : currentStep.app === 'leland-strata' ? 'PO Workspace'
      : currentStep.app === 'leland-seradex' ? 'Order System'
      : currentStep.app === 'leland-review' ? 'Review Queue'
      : 'PO Workspace';
    const lelandCompany = currentStep.role === 'System' ? 'Strata Services' : demoProfile.companyName;

    // BFI — appName follows the active module; company is always BFI Furniture
    const bfiAppName = currentStep.app === 'bfi-agency-fee' ? 'Agency Fee AI'
      : currentStep.app === 'bfi-receiving' ? 'Receiving AI'
      : 'Agency Fee AI';
    const bfiCompany = demoProfile.companyName;

    // Workspaces — appName follows the active module; company is Workscapes, Inc.
    const workspacesAppName = currentStep.app === 'workspaces-submit' ? 'Expense Submission'
      : currentStep.app === 'workspaces-approval' ? 'Manager Approval'
      : currentStep.app === 'workspaces-ap' ? 'AP Processing'
      : currentStep.app === 'workspaces-reporting' ? 'Spend Dashboard'
      : 'Expense AI';
    const workspacesCompany = demoProfile.companyName;

    // Officeworks — appName follows the active module; company is Officeworks Inc.
    const officeworksAppName = currentStep.app === 'officeworks-intake' ? 'Intake AI'
      : currentStep.app === 'officeworks-design' ? 'Design AI'
      : currentStep.app === 'officeworks-spec-check' ? 'Spec Check AI'
      : currentStep.app === 'officeworks-submission' ? 'Submission AI'
      : currentStep.app === 'officeworks-dashboard' ? 'Design Dashboard'
      : 'Spec Check AI';
    const officeworksCompany = demoProfile.companyName;

    // CLC — 4 flows, each maps to its own app label. Company is Creative Library Concepts.
    const clcAppName = currentStep.app === 'clc-calendar' ? 'Schedule AI'
      : currentStep.app === 'clc-sharepoint' ? 'Asset Seeding AI'
      : currentStep.app === 'clc-intake' ? 'Intake Validation AI'
      : currentStep.app === 'clc-dashboard' ? 'Operations Dashboard'
      : 'Schedule AI';
    const clcCompany = demoProfile.companyName;

    const resolvedAppName = isContinua ? continuaAppName
      : isLeland ? lelandAppName
      : isBFI ? bfiAppName
      : isWorkspaces ? workspacesAppName
      : isOfficeworks ? officeworksAppName
      : isCLC ? clcAppName
      : currentStep.app === 'email-marketplace' ? (isWRG ? 'WRG Mail' : 'Wells Fargo Mail')
      : currentStep.app === 'catalog' ? 'Marketplace'
      : currentStep.app === 'service-now' ? 'ServiceNow'
      : currentStep.app === 'crm' ? 'Strata CRM'
      : isWrgDesigner ? 'Designer Experience'
      : isWrgDealer ? 'Dealer Experience'
      : isWrgExpert ? 'Expert Hub'
      : isDuplerDealer ? 'Dealer Experience'
      : isDuplerExpert ? 'Expert Hub'
      : isExpert ? 'Expert Hub'
      : 'Dealer Experience';
    const resolvedCompany = isContinua ? continuaCompany
      : isLeland ? lelandCompany
      : isBFI ? bfiCompany
      : isWorkspaces ? workspacesCompany
      : isOfficeworks ? officeworksCompany
      : isCLC ? clcCompany
      : isExpert || isDuplerExpert || isWrgExpert || isWrgDesigner ? 'Strata Services'
      : demoProfile.companyName;

    // In demo mode, CRM steps swap the nav to crmNav to surface the CRM tab.
    // Everything else uses the profile's default nav (declared above).
    const nav = currentStep.app === 'crm' ? crmNav : profileNav;
    return { appName: resolvedAppName, companyName: resolvedCompany, customNavigation: nav };
  };

  const { appName, companyName, customNavigation } = getSimulationConfig();

  // Determine the correct active nav tab during demo mode
  const getActiveTab = () => {
    // Outside the tour, the app override (or defaultApp landing) drives
    // the highlighted tab. Falls back to currentPage.
    if (!isDemoActive) {
      const overrideApp = currentAppOverride ?? demoProfile.defaultApp;
      return overrideApp ?? currentPage;
    }
    const appToTab: Record<string, string> = {
      'dealer-kanban': 'transactions',
      'expert-hub': 'transactions',
      'service-now': 'dashboard',
      'catalog': 'dashboard',
      'email-marketplace': 'dashboard',
      'dashboard': 'dashboard',
      'transactions': 'transactions',
      'quote-po': 'quote-detail',
      'quote-detail': 'quote-detail',
      'order-detail': 'order-detail',
      'ack-detail': 'transactions',
      'mac': 'mac',
      'inventory': 'inventory',
      'crm': currentPage === 'dashboard' ? 'dashboard' : 'crm',
      'dupler-pdf': 'transactions',
      'dupler-warehouse': 'inventory',
      'dupler-reporting': 'dashboard',
      // WRG Demo v6: no global Navbar tab — Estimator owns its own tabs
      'wrg-estimator': 'dashboard',
      // Leland Demo: each app maps to its own primary nav tab (see lelandNav)
      'leland-strata': 'leland-strata',
      'leland-inbox': 'leland-inbox',
      'leland-seradex': 'leland-seradex',
      'leland-review': 'leland-review',
      // MBI Demo: each module owns its own primary nav tab (see mbiNav)
      'mbi-overview': 'mbi-overview',
      'mbi-budget': 'mbi-budget',
      'mbi-accounting': 'mbi-accounting',
      'mbi-quotes': 'mbi-quotes',
      'mbi-design': 'mbi-design',
      // BFI Demo: three tabs (Dashboard is permanent page, not a step)
      'bfi-dashboard': 'bfi-dashboard',
      'bfi-agency-fee': 'bfi-agency-fee',
      'bfi-receiving': 'bfi-receiving',
      // Workspaces Demo: two flows, submission tabs → submit nav, ap/reporting → ap nav
      'workspaces-submit': 'workspaces-submit',
      'workspaces-approval': 'workspaces-submit',
      'workspaces-ap': 'workspaces-ap',
      'workspaces-reporting': 'workspaces-reporting',
      // Officeworks Demo: 5 tabs (Dashboard persistent + 4 module tabs)
      'officeworks-dashboard': 'officeworks-dashboard',
      'officeworks-intake': 'officeworks-intake',
      'officeworks-design': 'officeworks-design',
      'officeworks-spec-check': 'officeworks-spec-check',
      'officeworks-submission': 'officeworks-submission',
      'officeworks-labor': 'officeworks-labor',
      'officeworks-sales': 'officeworks-sales',
      // CLC Demo: 4 tabs (Calendar · SharePoint · Intake · Dashboard)
      'clc-calendar': 'clc-calendar',
      'clc-sharepoint': 'clc-sharepoint',
      'clc-intake': 'clc-intake',
      'clc-dashboard': 'clc-dashboard',
    };
    if (isBFI && bfiDashboardActive) return 'bfi-dashboard'
    if (isOfficeworks && officeworksDashboardActive) return 'officeworks-dashboard'
    return appToTab[currentStep.app] || currentPage;
  };

  // renderAppByName · pure app → shell mapping. Used both by the tour
  // (renderSimulation drives via currentStep.app) and by the modo-normal
  // landing (renderCurrentPage delegates when the profile declares
  // defaultApp or the user clicks a custom nav tab).
  //
  // Returns null if the app has no dedicated shell — caller decides
  // the fallback (ExpertHubTransactions in the tour, generic Dashboard
  // outside).
  const renderAppByName = (app: SimulationApp): React.ReactElement | null => {
    switch (app) {
      case 'expert-hub':
        return (
          <ExpertHubTransactions
            onLogout={handleLogout}
            onNavigateToDetail={(id) => {
              console.log('Navigate to detail', id);
              setCurrentPage('detail');
            }}
            onNavigateToWorkspace={() => setCurrentPage('workspace')}
            onNavigate={(p) => handleNavigate(p)}
          />
        );
      case 'quote-converter':
        // F78 · Diego 2026-08-18 · Quote Converter promoted a top-level
        // production experience · reuse the standalone page component.
        return (
          <QuoteConverter
            onLogout={handleLogout}
            onNavigateToWorkspace={() => setCurrentPage('workspace')}
            onNavigate={handleNavigate}
          />
        );
      case 'expert-hub-published':
        // F78 · Diego 2026-08-18 · Expert Hub top-level production experience
        // renders via the prod-sync wrapper (TenantProvider + noop callbacks) ·
        // NO requiere `currentStep` (legacy case 'expert-hub' se usa cuando
        // un tour profile · OPS/COI/Continua/Acme · lo lanza con steps).
        return <ExpertHubTransactionsWrapper />;
      case 'email-marketplace':
        return <EmailSimulation />;
      case 'dealer-kanban':
        return <DealerMonitorKanban onNavigate={handleNavigate} />;
      case 'service-now':
        return <ServiceNowSimulation />;
      case 'catalog':
        return <SpecializedCatalog />;
      case 'survey':
        return <ConversationalSurvey />;
      case 'quote-po':
        return <QuoteDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'order-detail':
        return <OrderDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'dashboard':
        return <Dashboard onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'ack-detail':
        return <AckDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'transactions':
        return <Transactions onLogout={handleLogout} onNavigateToDetail={(type) => setCurrentPage(type as any)} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'mac':
        return <MAC onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'quote-detail':
        return <QuoteDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'rfq-detail':
        return <QuoteDetail isRFQ onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
      case 'crm':
        return <CRMSimulation onNavigate={handleNavigate} activePage={currentPage} />;
      case 'dupler-pdf':
        // Vendor Data flow lives in its own dedicated section · Diego
        // 2026-07-22 · previously it was stacked on top of Transactions
        // which confused the audience (two unrelated pages on screen).
        // For d1.4 / d1.5 the DuplerPdfProcessor returns null internally
        // and shows Transactions as a fallback below.
        return (
          <>
            <DuplerPdfProcessor onNavigate={handleNavigate} />
            {currentStep?.id !== 'd1.1' && currentStep?.id !== 'd1.2' && currentStep?.id !== 'd1.3' && (
              <Transactions onLogout={handleLogout} onNavigateToDetail={(type) => setCurrentPage(type as any)} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />
            )}
          </>
        );
      case 'dupler-warehouse':
        return (
          <>
            <DuplerWarehouse onNavigate={handleNavigate} />
            <Inventory onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />
          </>
        );
      case 'dupler-reporting':
        return (
          <Dashboard onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />
        );
      case 'wrg-estimator':
        // Single collaborative Shell — role + visual state driven by currentStep
        return <StrataEstimatorShell />;
      case 'mbi-overview':
        return <MBIOverviewPage />;
      case 'mbi-budget':
        return <MBIBudgetPage />;
      case 'mbi-accounting':
        return <MBIAccountingPage />;
      case 'mbi-quotes':
        return <MBIQuotesPage />;
      case 'mbi-design':
        return <MBIDesignPage />;
      case 'leland-strata':
        return <LelandStrataShell />;
      case 'leland-inbox':
        return <LelandInboxApp />;
      case 'leland-seradex':
        return <LelandSeradexApp />;
      case 'leland-review':
        return <LelandReviewQueueApp />;
      case 'bfi-agency-fee':
      case 'bfi-receiving':
        if (bfiDashboardActive) return <BFIDashboardPage />
        return <BFIPage />;
      case 'bfi-dashboard':
        return <BFIDashboardPage />;
      case 'workspaces-submit':
      case 'workspaces-approval':
      case 'workspaces-ap':
      case 'workspaces-reporting':
        return <WorkspacesPage />;
      case 'officeworks-intake':
      case 'officeworks-design':
      case 'officeworks-spec-check':
      case 'officeworks-submission':
      case 'officeworks-labor':
      case 'officeworks-sales':
        if (officeworksDashboardActive) return <OfficeworksDashboardPage />
        return <OfficeworksPage />;
      case 'officeworks-dashboard':
        return <OfficeworksDashboardPage />;
      case 'clc-calendar':
      case 'clc-sharepoint':
      case 'clc-intake':
        return <CLCPage />;
      case 'clc-dashboard':
        return <CLCDashboardPage />;
      default:
        return null;
    }
  };

  const renderSimulation = () => {
    // Allow in-demo navigation to detail pages (e.g. step 1.2 → order-detail)
    if (currentPage === 'order-detail') {
      return <OrderDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'ack-detail') {
      return <AckDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    }
    // Tour path: route the current step's app to its shell. Fallback to
    // ExpertHubTransactions when the app has no dedicated shell (kept for
    // backward compat with older steps).
    return renderAppByName(currentStep.app) ?? (
      <ExpertHubTransactions
        onLogout={handleLogout}
        onNavigateToDetail={(id) => {
          console.log('Navigate to detail', id);
          setCurrentPage('detail');
        }}
        onNavigateToWorkspace={() => setCurrentPage('workspace')}
        onNavigate={(p) => handleNavigate(p)}
      />
    );
  };

  const renderCurrentPage = () => {
    // Modo normal landing · when the profile declares defaultApp or the
    // user clicked a custom nav tab (currentAppOverride), delegate to
    // renderAppByName. Only applies when the app is idle on its default
    // pages ('transactions' or 'dashboard') — deeper navigations like
    // 'detail' / 'workspace' stay caller-owned.
    const overrideApp = currentAppOverride ?? demoProfile.defaultApp;
    if (overrideApp && (currentPage === 'transactions' || currentPage === 'dashboard')) {
      const rendered = renderAppByName(overrideApp);
      if (rendered) return rendered;
    }

    // Inbound-Outbound profile redirects hidden pages to dashboard to avoid 404 on stale bookmarks.
    if (isInboundOutbound && inboundOutboundHiddenPages.includes(currentPage)) {
      setCurrentPage('dashboard');
      return <Dashboard onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'dashboard') return <Dashboard onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'inventory') return <Inventory onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'catalogs') return <Catalogs onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'mac') return <MAC onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'transactions') return (
      <Transactions
        onLogout={handleLogout}
        onNavigateToDetail={(type) => setCurrentPage(type as any)}
        onNavigateToWorkspace={() => setCurrentPage('workspace')}
        onNavigate={handleNavigate}
      />
    );
    if (currentPage === 'crm') return <CRM onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'shipping') return <Shipping onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'quote-converter') return <QuoteConverter onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'pricing') return <Pricing onLogout={handleLogout} onNavigateToDetail={() => setCurrentPage('detail')} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'detail') return <Detail onBack={() => setCurrentPage('dashboard')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'quote-detail') return <QuoteDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'rfq-detail') return <QuoteDetail isRFQ onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'order-detail') return <OrderDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'ack-detail') return <AckDetail onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'ack-detail-ai') return <AckDetail initialTab={1} onBack={() => setCurrentPage('transactions')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} onNavigate={handleNavigate} />;
    if (currentPage === 'workspace') return <Workspace onBack={() => setCurrentPage('dashboard')} onLogout={handleLogout} onNavigateToWorkspace={() => setCurrentPage('workspace')} />;
    return null;
  };

  return (
    <GenUIProvider onNavigate={handleNavigate}>
      <SessionExpiryModal
        isOpen={showSessionWarning}
        onExtend={refreshSession}
        onLogout={handleLogout}
      />

      {/* Demo UI Elements · F44.a.3 · profiles con `hideChrome: true`
           esconden la sidebar de steps + banner + spotlight overlay + AI pill.
           DemoProcessPanel se mantiene siempre montado porque drivea los
           timers de auto-advance y muestra los content modals de cada step
           (ej. Normalization Pipeline en step 1.3 · parte de la experiencia,
           no chrome). */}
      {!demoProfile.hideChrome && <DemoSidebar />}
      {!demoProfile.hideChrome && <DemoSpotlight />}
      <DemoProcessPanel onNavigate={handleNavigate} />
      {!demoProfile.hideChrome && <DemoStepBanner />}

      {/* FIXED NAVBAR (Unified) — hidden for email simulation, WRG Estimator routes & workspace/detail */}
      {/* isBFIMobile: hide navbar for BFI mobile-frame steps (r1.6) so the phone renders full-screen */}
      {(isDemoActive
        ? currentStep.app !== 'email-marketplace'
          && currentStep.app !== 'wrg-estimator'
          && currentStep.app !== 'workspaces-submit'
          && !bfiLoginActive
          && !(isBFI && ['r1.6', 'a1.0', 'a1.2'].includes(currentStep.id))
          && !['1.6', '2.1', '4.4'].includes(currentStep.id)
          && !(currentStep.id === '1.8' && currentStep.app !== 'crm')
          && !(currentStep.id === '3.5' && !isContinua)
        : currentPage !== 'detail' && currentPage !== 'workspace'
      ) && (
        // Navbar sits above page content/sticky headers (z-40) but BELOW all modals/overlays (z-50+) so dialogs cover it
        <div className="fixed top-0 left-0 right-0 z-[45]">
          <Navbar
            onLogout={handleLogout}
            onNavigateToWorkspace={() => setCurrentPage('workspace')}
            onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
            activeTab={getActiveTab()}
            onNavigate={handleNavigate}
            appName={appName}
            companyName={companyName}
            customNavigation={customNavigation}
          />
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT · F44.a.3 · el `pl-80` compensa el ancho del
           DemoSidebar. Si `hideChrome` esconde la sidebar, no hay que
           compensar · el content ocupa full width.
           F45.c (Diego 2026-07-29) · el DemoAIIndicator SÍ se renderea con
           hideChrome · es un sticky bar top compacto que muestra el step
           title/desc/aiSummary/userAction · permite ver el diff narrativo
           entre profiles (ej. coi enriquecido vs acme genérico) sin
           reintroducir toda la Demo Flow sidebar. */}
      <main className={`transition-all duration-300 ${(isDemoActive ? currentStep.app !== 'email-marketplace' && currentStep.app !== 'wrg-estimator' && currentStep.app !== 'workspaces-submit' && !bfiLoginActive && !(isBFI && ['r1.6', 'a1.0', 'a1.2'].includes(currentStep.id)) : currentPage !== 'detail' && currentPage !== 'workspace') ? 'pt-16' : ''} ${isDemoActive && !demoProfile.hideChrome ? (isSidebarCollapsed ? 'pl-0' : 'pl-80') + ' animate-in fade-in duration-500' : ''} min-h-screen bg-background`}>
        {isDemoActive && <DemoAIIndicator />}
        {isDemoActive ? renderSimulation() : renderCurrentPage()}
      </main>

      <DemoGuide
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Architecture Slide — kept for programmatic access, button removed */}
      <StrataArchitectureSlide open={showArchSlide} onClose={() => setShowArchSlide(false)} />

      {/* RoleSwitchToast · transient confirmation strip fired on every role
          change. Kept scoped to inbound-outbound for now (only profile using
          the manufacturer/dealer split); F5+ will opt in per experience. */}
      {isInboundOutbound && <RoleSwitchToast />}
    </GenUIProvider>
  );
}

export default App
