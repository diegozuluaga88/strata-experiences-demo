// ═══════════════════════════════════════════════════════════════════════════════
// Aliases · single source of truth for generic tenant / client / persona names
//
// Diego (2026-07-16): remove all real company / client / person names from
// user-facing text to avoid conflict-of-interest exposure in the public demo.
// Naming style: `<Role> <Neutral-Descriptor>` — descriptors are colors,
// natural words, or geographic-abstract terms. Manufacturers (Herman Miller,
// Steelcase, Knoll, Teknion, etc.) are NOT aliased — they are public brands
// with no confidentiality concern.
//
// Consumed by:
//   · src/config/demoProfiles.ts       — title/subtitle/companyName/name fields
//   · src/config/profiles/*-data/*.ts  — tenant crumbs
//   · src/components/*/*.tsx           — inline references (via TENANT lookup)
//
// Migration is scaled by layer (see F16.6.c in the plan file):
//   Capa 1 · demoProfiles.ts dropdown fields               ← this pass
//   Capa 2 · tenant crumbs in shells (Leland/MBI/BFI/etc.)
//   Capa 3 · MANATT client-of-client (345 hits / 25 files)
//   Capa 4 · Mock dealers in Transactions / Dashboard
//   Capa 5 · Persona names in steps + scenes
//   Capa 6 · Comments / JSDoc (traceability internal)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TENANT_ALIASES · one entry per DemoProfileId. Each maps to the user-facing
 * name that replaces the real client name everywhere in the demo.
 */
export const TENANT_ALIASES = {
    leland:             { name: 'Dealer Bear',          short: 'DB',  role: 'furniture dealer' },
    officeworks:        { name: 'Dealer Falcon',        short: 'DF',  role: 'furniture dealer' },
    bfi:                { name: 'Dealer Copper',        short: 'DC',  role: 'agency-fee dealer' },
    workspaces:         { name: 'Dealer Slate',         short: 'DS',  role: 'commercial furniture dealer' },
    continua:           { name: 'Dealer Willow',        short: 'DW',  role: 'project + inventory dealer' },
    mbi:                { name: 'Dealer Ivory',         short: 'DI',  role: 'furniture dealer' },
    clc:                { name: 'Dealer Amber',         short: 'DA',  role: 'library + install dealer' },
    dupler:             { name: 'Dealer Cedar',         short: 'DCd', role: 'dealer with warehouse operations' },
    wrg:                { name: 'Dealer Onyx',          short: 'DO',  role: 'furniture dealer' },
    coi:                { name: 'Dealer Sage',          short: 'DSg', role: 'contract office interiors dealer' },
    acme:               { name: 'Dealer Rust',          short: 'DR',  role: 'furniture dealer' },
    ops:                { name: 'Dealer Ember',         short: 'DE',  role: 'financial-control dealer' },
    crm:                { name: 'Strata CRM',           short: 'CRM', role: 'CRM standalone' },
    // F78.n · Diego 2026-08-18 · capability showcase · no fake dealer alias.
    'inbound-outbound': { name: 'Transaction Management', short: 'TM',  role: 'dealer ↔ manufacturer transaction flow' },
} as const;

export type TenantId = keyof typeof TENANT_ALIASES;

/**
 * Helper to look up an alias with a fallback (for pre-migrated files that
 * still reference the raw tenant id).
 */
export function tenantAlias(id: TenantId | string): { name: string; short: string; role: string } {
    return (TENANT_ALIASES as Record<string, { name: string; short: string; role: string }>)[id]
        ?? { name: id, short: id.slice(0, 2).toUpperCase(), role: 'dealer' };
}

/**
 * CLIENT_OF_CLIENT_ALIASES · demo scenarios reference real end-customers of
 * the tenants (Metro Legal law firm, Fairport Library, etc.). These get generic
 * regional/sector labels.
 */
export const CLIENT_OF_CLIENT_ALIASES = {
    'MANATT Phelps & Phillips LLP': 'Metro Legal Firm LLC',
    'MANATT Phelps & Phillips':     'Metro Legal Firm',
    'MANATT':                       'Metro Legal',
    'Manatt Phelps & Phillips LLP': 'Metro Legal Firm LLC',
    'Manatt Phelps & Phillips':     'Metro Legal Firm',
    'Manatt':                       'Metro Legal',
    'Fairport Public Library':      'Regional Public Library',
    'Tappé Architects':             'North Architects Group',
    'SWBR Architects':              'West Architects Partners',
    'SWBR Architects & Engineers':  'West Architects Partners',
    'SWBR':                         'West Architects',
    'NYC DOE':                      'Metro School District',
    'CoNY':                         'Metro Public Schools',
    'JPS Health Network':           'Regional Health Network',
    'JPS Health Center for Women':  'Regional Womens Health Center',
} as const;

/**
 * DEALER_MOCK_ALIASES · fictitious dealer names in Transactions / Dashboard /
 * mock data tables.
 */
export const DEALER_MOCK_ALIASES = {
    'NorthPoint Furniture Group':  'Northline Furniture Group',
    'Beacon Hill Furnishings':     'Bayline Furnishings',
    'Heritage Office Group':       'Legacy Office Group',
    'Northeast Office Group':      'Coastal Office Group',
    'Coastal Hospitality':         'Waterside Hospitality',
    'Coastal City':                'Waterside City',
    'Helix Technologies':          'Vertex Technologies',
    'Modern Residences Co':        'Skyline Residences Co',
    'State University · Teaching & Learning Center': 'Regional University · Learning Center',
    'State University':            'Regional University',
    'Teaching & Learning Center':  'Learning Center',
    'Riverbend Workspaces':        'Ridgeview Workspaces',
    'Acme Manufacturing':          'Vertex Manufacturing',
} as const;

/**
 * PERSONA_ALIASES · real names → role-only generic labels. Preserves narrative
 * clarity (reader knows what job function is speaking) without exposing
 * identity.
 */
export const PERSONA_ALIASES = {
    // Client-side personas (visible in tour steps + scene UI)
    'Sara Chen':            'Account Manager',
    'David Park':           'Regional Sales Manager',
    'Kimberly Tucker':      'Design Manager',
    'Caitlin Barolet':      'Designer',
    'Felicia Miano-Poles':  'EVP Design',
    'Felicia M.-P.':        'EVP Design',
    'Felicia':              'EVP Design',
    'Chris Hanes':          'CEO',
    'Joshua':               'Senior Reviewer',
    'Josh':                 'Director of Operations',
    'Walter Goley':         'Operations Manager',
    'Walter':               'Operations Manager',
    'Beth Gianino':         'Design Manager',
    'Marcus Reid':          'Sales Director',
    'Priya Nair':           'Finance Lead',
    'Ken Osei':             'CFO',
    'Robert Chen':          'Account Manager',
    'Lauren':               'Claims Analyst',
    'Michael Nickel':       'Approver',
    'Nancy':                'Receiving Coordinator',
    'Patricia':             'Estimator',
    'Lena':                 'AP Coordinator',
    'Jessica':              'Sales Coordinator',
    'Kate':                 'Project Manager',
    'Jordan Hart':          'Controller',
    'Mark Kielhafner':      'Executive Sponsor',
    'Justin Laramie':       'Sales Lead',
    'Lisa Garretson':       'Collections Lead',
    'Amy Shoemaker':        'AP Lead',
    'Carrie Numelin':       'Operations Lead',
    'Marcia Ludwig':        'Design Coordinator',
    'Erin Skinner':         'Project Coordinator',
    'Amy Behl':             'Estimator',
    'Michael':              'Approver',
    'Nicki Nevad':          'Designer',
    'Kathy Belleville':     'Operations Manager',
    'Lynda Alexander':      'Designer',
    'Amanda Renshaw':       'Sales Rep',
    'Nicky Wesemann':       'Designer',
    'Keyla Gettings':       'Coordinator',
    'Mark Ramsey':          'PM',
    'David Penagos':        'Product Manager',
    'Jenniffer Vargas':     'Designer',
    'John Smith':           'Employee',
    'Sarah':                'Operations Manager',
    'Letza':                'Accountant',
    'Mehmet':               'CFO',
    'Tammy':                'AP Coordinator',
    'David':                'Senior Estimator',
    'Alex':                 'Estimator',
    'Sara':                 'Sales Rep',
    'Riley Morgan':         'Designer',
    'Riley':                'Designer',
    'James Ortiz':          'PM',
    'Brandon':              'Reviewer',
    'Mark':                 'Sponsor',
    'Carlos':               'Sponsor',
    'Mario':                'Estimator',
    'Stacey':               'Coordinator',

    // Strata team (visible in Dashboard avatar + step comments + doc comments)
    'Diego Sabatini':       'Strata PM',
    'Diego Morales':        'Strata PM',
    'Diego Zuluaga':        'Strata Lead',
    'Diego':                'Strata Lead',
    'Asly':                 'Strata Design Lead',
    'Daniela':              'Strata PM',
    'Kenya':                'Strata PM',
    'Wendy Marchuck':       'Strata Sales Director',
    'Wendy':                'Strata Sales Director',
    'Matt':                 'Strata Sales Lead',
} as const;

/**
 * REAL_EMAIL_ALIASES · redact leaked emails in stakeholder / transcript docs.
 */
export const EMAIL_ALIASES = {
    'mkielhafner@mbioffice.com':  'contact@dealer-ivory.example',
    'dpenagos@goavanto.com':      'pm@strata.example',
    'tekco1@teknion.com':         'ack@teknion.example',
    'dispatch@albanyinstall.co':  'dispatch@install-partner.example',
} as const;
