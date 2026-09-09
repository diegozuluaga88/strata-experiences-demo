// TT.1 · Diego 2026-09-03 · Mock projects for time-tracker.
// Cross-company (Rightsize / OFC / Mac Relocations) matching Wurkwel's
// real setup — a designer at Rightsize can log time to an OFC project.
//
// Status vocabulary mirrors NetSuite: active | delivered | closed | billed.
// The project selector filters via rules-based auto-hide:
//   hide if (deliveredMoreThan365DaysAgo) OR (billed + noPunchList)
// See pain #5 in the benchmark MD.

export type ProjectStatus = 'active' | 'delivered' | 'closed' | 'billed'
export type Company = 'Rightsize' | 'Office Furniture Center' | 'Mac Relocations'

export interface Project {
    id: string
    name: string
    /** Client the project is for. */
    client: string
    /** Which of the 3 sister companies owns the project. */
    company: Company
    status: ProjectStatus
    /** Budgeted hours for the design work. Used by CumulativeHoursInline. */
    budgetHours: number
    /** How many hours logged so far (baseline). Live entries add to this in-form. */
    hoursLoggedBaseline: number
    /** Contract value in USD · used by C-level dashboard fase 2. */
    contractValue?: number
    /** Sales rep responsible · used to route the deliverable-complete email. */
    salesRepName: string
    salesRepEmail: string
    /** ISO date of delivery confirmation. Presence + age drives auto-hide. */
    deliveryConfirmedAt?: string
    /** Presence of open punch list keeps the project selectable even after billing. */
    hasPunchList?: boolean
}

// TT.44.2 · Diego 2026-09-08 · TODAY_ISO ahora es dinámico (hoy real)
// para que el demo muestre el current day correcto. Antes era hardcoded
// a 2026-09-03 para determinismo · si necesitas volver a fijo, cambia
// a `'YYYY-MM-DD'` en TODAY_ISO abajo.
export const PROJECTS: Project[] = [
    // === Active projects (all designers can log freely) ===
    // TT.65.1 · Diego 2026-09-09 · baselines ajustados para dar variedad al
    // demo del ProjectProgressCard: 1 past · 2 near · 2 on-track · 1 early.
    // Antes todo caía en <50% (early/on-track boring) o al sumar TIME_ENTRIES
    // saltaba a 200-400% (todo past-plan · sin señal).
    { id: 'PRJ-RS-2401', name: 'Whittier Legal · Office renovation', client: 'Whittier & Grey LLP', company: 'Rightsize', status: 'active', budgetHours: 120, hoursLoggedBaseline: 98, contractValue: 180000, salesRepName: 'Sarah Johnson', salesRepEmail: 'sarah.johnson@rightsize.com' },
    { id: 'PRJ-RS-2405', name: 'Meridian HQ · Furniture spec + install', client: 'Meridian Health', company: 'Rightsize', status: 'active', budgetHours: 220, hoursLoggedBaseline: 132, contractValue: 385000, salesRepName: 'Marcus Webb', salesRepEmail: 'marcus.webb@rightsize.com' },
    { id: 'PRJ-OFC-3102', name: 'Blue Ridge University · Library refresh', client: 'Blue Ridge University', company: 'Office Furniture Center', status: 'active', budgetHours: 80, hoursLoggedBaseline: 55, contractValue: 92000, salesRepName: 'Priya Shah', salesRepEmail: 'priya.shah@ofc.com' },
    { id: 'PRJ-OFC-3115', name: 'Ferris Automotive · Showroom + offices', client: 'Ferris Automotive Group', company: 'Office Furniture Center', status: 'active', budgetHours: 320, hoursLoggedBaseline: 156, contractValue: 540000, salesRepName: 'Daniel Okafor', salesRepEmail: 'daniel.okafor@ofc.com' },
    { id: 'PRJ-MAC-1204', name: 'Ashford Financial · Move + install', client: 'Ashford Financial Advisors', company: 'Mac Relocations', status: 'active', budgetHours: 60, hoursLoggedBaseline: 51, contractValue: 68000, salesRepName: 'Elena Martínez', salesRepEmail: 'elena.martinez@macrelocations.com' },
    { id: 'PRJ-RS-2409', name: 'Northgate Clinic · Waiting area redesign', client: 'Northgate Medical', company: 'Rightsize', status: 'active', budgetHours: 40, hoursLoggedBaseline: 44, contractValue: 45000, salesRepName: 'Sarah Johnson', salesRepEmail: 'sarah.johnson@rightsize.com' },
    // === Delivered but recent · still visible in the picker ===
    { id: 'PRJ-OFC-3098', name: 'Kenwood Elementary · Classroom furnishings', client: 'Kenwood School District', company: 'Office Furniture Center', status: 'delivered', budgetHours: 65, hoursLoggedBaseline: 71, contractValue: 78000, salesRepName: 'Noah Fischer', salesRepEmail: 'noah.fischer@ofc.com', deliveryConfirmedAt: '2026-07-15', hasPunchList: true },
    { id: 'PRJ-RS-2380', name: 'Cascade Advisors · Conference room reset', client: 'Cascade Advisors', company: 'Rightsize', status: 'billed', budgetHours: 25, hoursLoggedBaseline: 27, contractValue: 32000, salesRepName: 'Tomás Álvarez', salesRepEmail: 'tomas.alvarez@rightsize.com', deliveryConfirmedAt: '2026-06-22', hasPunchList: true },
    // === Closed · auto-hidden (billed + no punch list) ===
    { id: 'PRJ-OFC-3020', name: 'Hillcrest Hotel · Lobby refit (closed)', client: 'Hillcrest Hospitality', company: 'Office Furniture Center', status: 'billed', budgetHours: 180, hoursLoggedBaseline: 172, contractValue: 260000, salesRepName: 'Marcus Webb', salesRepEmail: 'marcus.webb@ofc.com', deliveryConfirmedAt: '2026-04-10', hasPunchList: false },
    { id: 'PRJ-MAC-1180', name: 'Peak Realty · Move only (closed)', client: 'Peak Realty Group', company: 'Mac Relocations', status: 'billed', budgetHours: 20, hoursLoggedBaseline: 21, contractValue: 24000, salesRepName: 'Elena Martínez', salesRepEmail: 'elena.martinez@macrelocations.com', deliveryConfirmedAt: '2026-05-18', hasPunchList: false },
    // === Old · auto-hidden (delivered > 365d ago) ===
    { id: 'PRJ-RS-2210', name: 'Grand Central Chambers · 2024 project (old)', client: 'Grand Central Legal', company: 'Rightsize', status: 'closed', budgetHours: 300, hoursLoggedBaseline: 288, contractValue: 420000, salesRepName: 'Sarah Johnson', salesRepEmail: 'sarah.johnson@rightsize.com', deliveryConfirmedAt: '2025-06-01' },
    { id: 'PRJ-OFC-2955', name: 'Riverside Academy · Old library (old)', client: 'Riverside Academy', company: 'Office Furniture Center', status: 'closed', budgetHours: 90, hoursLoggedBaseline: 88, contractValue: 105000, salesRepName: 'Priya Shah', salesRepEmail: 'priya.shah@ofc.com', deliveryConfirmedAt: '2025-04-15' },
]

// TT.44.2 · Diego 2026-09-08 · "today" real (dinámico) · Diego pidió que
// el demo muestre el current day correcto en el calendar y el heatmap.
export const TODAY_ISO: string = todayIsoLocal()

function todayIsoLocal(): string {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

/** Rules-based auto-hide (pain #5). */
export function isProjectVisibleByRules(project: Project, todayIso: string = TODAY_ISO): boolean {
    if (project.status === 'active') return true
    const today = new Date(todayIso)
    // Rule 1: delivered/closed/billed > 365d ago = hidden
    if (project.deliveryConfirmedAt) {
        const delivered = new Date(project.deliveryConfirmedAt)
        const days = Math.floor((today.getTime() - delivered.getTime()) / 86_400_000)
        if (days > 365) return false
    }
    // Rule 2: billed + no punch list = hidden
    if (project.status === 'billed' && !project.hasPunchList) return false
    // Rule 3: closed + no punch list = hidden
    if (project.status === 'closed' && !project.hasPunchList) return false
    return true
}

export function getProject(id: string | undefined | null): Project | null {
    if (!id) return null
    return PROJECTS.find(p => p.id === id) ?? null
}
