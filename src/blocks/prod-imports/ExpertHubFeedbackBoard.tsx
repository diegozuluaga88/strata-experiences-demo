// SOURCE: ack-vs-po-demo/src/FeedbackBoard.tsx@455a5b7 · TT.60 · S3 lift for
// strata-experiences-demo · 2026-09-08 · Diego "y la parte de feedback"
// Adapt imports ./components/* → ./deps/* + agregar leftSlot={InlineSwitcher}
// en el Navbar wire (TT.55/58 pattern).
import { useState, useMemo, useEffect } from 'react'
import { Search, MessageSquare, ExternalLink, Inbox, AlertTriangle, Check, Trash2, Copy as CopyIcon, UserPlus, XCircle, RotateCcw, Filter } from 'lucide-react'
import Navbar from './deps/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'
import FeedbackDetailModal from './deps/feedback/FeedbackDetailModal'
import AssignFeedbackModal from './deps/feedback/AssignFeedbackModal'
import { getTeamMember, solidAvatarColor, type TeamMember } from './deps/team/teamMembers'
import InlineExperienceSwitcher from '../../components/navbar/InlineExperienceSwitcher'

interface FeedbackBoardProps {
    onLogout: () => void
    onNavigate: (page: string) => void
    /** ST-1169 · omit InlineExperienceSwitcher chip · default true. */
    navbarSwitcher?: boolean
    /** ST-1169 · tabs a ocultar del center-nav. */
    navbarHiddenTabs?: string[]
    /** ST-1169 · badge counts por tab name. */
    navbarTabBadges?: Record<string, number>
}

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type FeedbackState = 'Submitted' | 'Triaged' | 'Assigned' | 'Resolved' | 'Closed' | 'Dropped' | 'Duplicated'
export type Category = 'Bug' | 'Feature Request' | 'UI/UX' | 'Data' | 'Performance'

export interface FeedbackAttachment {
    name: string
    type: string  // e.g., 'PDF', 'PNG'
    sizeKB: number
}

export interface FeedbackItem {
    id: string
    description: string
    category: Category
    severity: Severity
    state: FeedbackState
    assignedTo?: { id: string; name: string; initials: string }
    submittedBy: string
    date: string
    jira?: string
    experience?: string  // e.g., 'pdf-to-sif' · prod field
    attachment?: FeedbackAttachment
}

// FB-08a · comment thread · reporter/expert back-and-forth on each feedback.
export interface FeedbackComment {
    id: string
    author: string
    authorEmail: string
    initials: string
    role: 'reporter' | 'expert'
    body: string
    createdAt: string  // ISO timestamp
}

// localStorage key namespace · per Fase A persistence decision (2026-06-26).
const STATE_OVERRIDES_KEY = 'expert-hub.feedback.stateOverrides'
const UPVOTES_KEY = 'expert-hub.feedback.upvotes'
const COMMENTS_KEY = 'expert-hub.feedback.comments'
const JIRA_OVERRIDES_KEY = 'expert-hub.feedback.jiraOverrides'
const ASSIGNED_OVERRIDES_KEY = 'expert-hub.feedback.assignedOverrides'
const VIEWED_KEY = 'expert-hub.feedback.viewed'
// Items emitted by the FeedbackComposerModal (OCRTracking / Transactions).
const SUBMISSIONS_KEY = 'expert-hub.feedback.submissions'

function loadStateOverrides(): Record<string, FeedbackState> {
    try {
        const raw = localStorage.getItem(STATE_OVERRIDES_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function saveStateOverrides(overrides: Record<string, FeedbackState>) {
    try { localStorage.setItem(STATE_OVERRIDES_KEY, JSON.stringify(overrides)) } catch {}
}

// FB-07 · upvotes per feedback id · "Me too" button incrementa el counter.
function loadUpvotes(): Record<string, number> {
    try {
        const raw = localStorage.getItem(UPVOTES_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function saveUpvotes(votes: Record<string, number>) {
    try { localStorage.setItem(UPVOTES_KEY, JSON.stringify(votes)) } catch {}
}

// FB-08a · comments per feedback id · seed data se conserva via merge ·
// localStorage overrides los seeds para que el QA persista entre refresh.
function loadComments(): Record<string, FeedbackComment[]> {
    try {
        const raw = localStorage.getItem(COMMENTS_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function saveComments(comments: Record<string, FeedbackComment[]>) {
    try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments)) } catch {}
}

// FB-04 · jira overrides · "Promote to Jira" action sets a mock ticket id.
function loadJiraOverrides(): Record<string, string> {
    try {
        const raw = localStorage.getItem(JIRA_OVERRIDES_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function saveJiraOverrides(o: Record<string, string>) {
    try { localStorage.setItem(JIRA_OVERRIDES_KEY, JSON.stringify(o)) } catch {}
}

// Assigned owner overrides · "Assign" picker selects un team member · maps
// feedback id → member id. Pulled junto con state override en items merge.
function loadAssignedOverrides(): Record<string, string> {
    try {
        const raw = localStorage.getItem(ASSIGNED_OVERRIDES_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}

function saveAssignedOverrides(o: Record<string, string>) {
    try { localStorage.setItem(ASSIGNED_OVERRIDES_KEY, JSON.stringify(o)) } catch {}
}

// Unread tracking · items in `viewed` count as read. "All" tab dual badge
// shows unread (red) + total (gray) per prod layout. First-load init marks
// all current seed ids as viewed so only NEW items (submitted via composer)
// surface como unread · matches prod behavior where existing items aren't red.
function loadViewed(seedIds: string[]): Set<string> {
    try {
        const raw = localStorage.getItem(VIEWED_KEY)
        if (raw) return new Set(JSON.parse(raw))
        // First mount · prime viewed con todos los seeds existentes.
        const initial = new Set(seedIds)
        localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(initial)))
        return initial
    } catch { return new Set() }
}

function saveViewed(s: Set<string>) {
    try { localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(s))) } catch {}
}

// Reads submissions emitted by the FeedbackComposerModal (OCRTracking +
// Transactions handlers) y los normaliza a FeedbackItem · permite que aparezcan
// en el board sin tocar el seed array.
function loadSubmissions(): FeedbackItem[] {
    try {
        const raw = localStorage.getItem(SUBMISSIONS_KEY)
        if (!raw) return []
        const arr = JSON.parse(raw) as Array<any>
        return arr.map((s, idx) => {
            const created = new Date(s.submittedAt || Date.now() - idx * 60000)
            // Composer Category set ('Bug'|'Suggestion'|'Data Quality'|'Other') →
            // Board canonical (Bug | Feature Request | UI/UX | Data | Performance).
            let cat: Category = 'UI/UX'
            if (s.category === 'Bug') cat = 'Bug'
            else if (s.category === 'Suggestion') cat = 'Feature Request'
            else if (s.category === 'Data Quality') cat = 'Data'
            // Composer Severity ('Low'|'Medium'|'High') → Board (default Medium).
            const sev: Severity = (s.severity ?? 'Medium') as Severity
            const item: FeedbackItem = {
                id: s.id || `FB-${created.getTime().toString(36).toUpperCase()}`,
                description: s.description,
                category: cat,
                severity: sev,
                state: 'Submitted',
                submittedBy: 'diego.zuluaga@agenticdream.com',
                date: created.toISOString(),
                experience: s.experience,
            }
            return item
        })
    } catch { return [] }
}

// Seed comments para demos · merged sobre lo persistido al primer load.
const SEED_COMMENTS: Record<string, FeedbackComment[]> = {
    'FB-7384D028': [
        { id: 'c1', author: 'Reynier Rivero', authorEmail: 'reynier.rivero@agenticdream.com', initials: 'RR', role: 'reporter',
          body: 'Hey Diego, this is one feedback. Saw the ACK comes back without line items when the vendor uses scanned PDFs.',
          createdAt: '2026-06-26T13:18:30.000Z' },
        { id: 'c2', author: 'Diego Zuluaga', authorEmail: 'diego.zuluaga@agenticdream.com', initials: 'DZ', role: 'expert',
          body: 'Got it, looking into the parser logs. Can you share which vendor specifically?',
          createdAt: '2026-06-26T13:22:10.000Z' },
        { id: 'c3', author: 'Reynier Rivero', authorEmail: 'reynier.rivero@agenticdream.com', initials: 'RR', role: 'reporter',
          body: 'Mostly Magnuson · happens on multi-page quotes. Attached the PDF that reproduces it.',
          createdAt: '2026-06-26T13:27:45.000Z' },
    ],
    'FB-1042': [
        { id: 'c1', author: 'R. Ramirez', authorEmail: 'r.ramirez@special-t.com', initials: 'RR', role: 'reporter',
          body: 'Line items not extracting from multi-page Magnuson quotes. Tried 3 different files.',
          createdAt: '2026-06-12T09:14:00.000Z' },
        { id: 'c2', author: 'Marcus Webb', authorEmail: 'marcus.webb@strata.com', initials: 'MW', role: 'expert',
          body: 'Triaged · this looks like the OCR multi-page pagination bug. Picked up JIRA OCR-318 for the fix.',
          createdAt: '2026-06-12T14:20:00.000Z' },
    ],
}

// FB-07 · group duplicates por (category + description normalized) · descriptions
// similares dentro del mismo category se agrupan. Match aproximado · primeros 60
// chars normalizados (lowercase + collapsed whitespace).
function dedupeKey(item: FeedbackItem): string {
    const desc = item.description.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60)
    return `${item.category}::${desc}`
}

interface DuplicateGroup {
    groupSize: number  // total items in the group (including this one)
    siblings: string[] // ids del resto del grupo (excluding self)
}

function buildDuplicateGroups(items: FeedbackItem[]): Record<string, DuplicateGroup> {
    const byKey: Record<string, string[]> = {}
    for (const it of items) {
        const k = dedupeKey(it)
        ;(byKey[k] ??= []).push(it.id)
    }
    const out: Record<string, DuplicateGroup> = {}
    for (const it of items) {
        const ids = byKey[dedupeKey(it)] ?? []
        out[it.id] = { groupSize: ids.length, siblings: ids.filter(x => x !== it.id) }
    }
    return out
}

const FEEDBACK: FeedbackItem[] = [
    {
        id: 'FB-1042',
        description: 'Line items not extracting from multi-page Magnuson quotes',
        category: 'Bug', severity: 'Critical', state: 'Assigned',
        assignedTo: { id: 'marcus', name: 'Marcus Webb', initials: 'MW' },
        submittedBy: 'r.ramirez@special-t.com', date: 'Jun 12, 2026', jira: 'OCR-318',
        experience: 'pdf-to-sif',
        attachment: { name: 'Magnuson-QT-2884.pdf', type: 'PDF', sizeKB: 412.3 },
    },
    {
        id: 'FB-1041',
        description: 'Add bulk "Mark as Completed" action for reconciled documents',
        category: 'Feature Request', severity: 'Medium', state: 'Triaged',
        assignedTo: { id: 'priya', name: 'Priya Shah', initials: 'PS' },
        submittedBy: 'c.morales@special-t.com', date: 'Jun 11, 2026', jira: 'OCR-309',
        experience: 'expert-hub',
    },
    {
        id: 'FB-1040',
        description: 'Vendor name shows lowercase for "ergotron" — should match catalog casing',
        category: 'UI/UX', severity: 'Low', state: 'Resolved',
        assignedTo: { id: 'daniel', name: 'Daniel Okafor', initials: 'DO' },
        submittedBy: 'd.zuluaga@special-t.com', date: 'Jun 10, 2026', jira: 'OCR-301',
        experience: 'expert-hub',
    },
    {
        id: 'FB-1039',
        description: 'Upload modal hangs on PDFs larger than 20MB',
        category: 'Performance', severity: 'High', state: 'Submitted',
        submittedBy: 'k.nguyen@special-t.com', date: 'Jun 10, 2026',
        experience: 'pdf-to-sif',
        attachment: { name: 'screenshot-hang.png', type: 'PNG', sizeKB: 1247.8 },
    },
    {
        id: 'FB-1038',
        description: 'BuzziSpace SKU US-SQ26-00958 mapped to wrong catalog entry',
        category: 'Data', severity: 'High', state: 'Assigned',
        assignedTo: { id: 'sarah', name: 'Sarah Johnson', initials: 'SJ' },
        submittedBy: 'r.ramirez@special-t.com', date: 'Jun 09, 2026', jira: 'OCR-296',
        experience: 'expert-hub',
    },
    {
        id: 'FB-1037',
        description: 'Duplicate of FB-1031 — same discrepancy on Dubois custom carpentry',
        category: 'Bug', severity: 'Medium', state: 'Duplicated',
        submittedBy: 'c.morales@special-t.com', date: 'Jun 08, 2026',
        experience: 'pdf-to-sif',
    },
    {
        id: 'FB-1036',
        description: 'Funnel counts not refreshing after deprecating a document',
        category: 'Bug', severity: 'Medium', state: 'Closed',
        assignedTo: { id: 'noah', name: 'Noah Fischer', initials: 'NF' },
        submittedBy: 'd.zuluaga@special-t.com', date: 'Jun 06, 2026', jira: 'OCR-284',
        experience: 'expert-hub',
    },
    {
        id: 'FB-1035',
        description: 'Request: export reconciled records to CSV',
        category: 'Feature Request', severity: 'Low', state: 'Dropped',
        submittedBy: 'k.nguyen@special-t.com', date: 'Jun 04, 2026',
        experience: 'expert-hub',
    },
    {
        id: 'FB-7384D028',
        description: 'Hey Diego, this is one feedback',
        category: 'Bug', severity: 'High', state: 'Submitted',
        submittedBy: 'reynier.rivero@agenticdream.com', date: 'Jun 26, 2026',
        experience: 'pdf-to-sif',
        attachment: { name: 'ACK-MAX-9999 — Acknowledgment.pdf', type: 'PDF', sizeKB: 238.8 },
    },
    // FB-07 mock · duplicate de FB-1039 ("Upload modal hangs on PDFs larger than 20MB")
    // para que el group indicator + Me too se vea con data realista.
    {
        id: 'FB-1034',
        description: 'Upload modal hangs on PDFs larger than 20MB',
        category: 'Performance', severity: 'High', state: 'Submitted',
        submittedBy: 'mariana.lopez@special-t.com', date: 'Jun 09, 2026',
        experience: 'pdf-to-sif',
    },
    {
        id: 'FB-1033',
        description: 'Upload modal hangs on PDFs larger than 20MB',
        category: 'Performance', severity: 'High', state: 'Triaged',
        submittedBy: 't.fischer@special-t.com', date: 'Jun 07, 2026',
        experience: 'pdf-to-sif',
    },
]

const FUNNEL: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'jira', label: 'In Jira' },
    { id: 'Submitted', label: 'Submitted' },
    { id: 'Triaged', label: 'Triaged' },
    { id: 'Assigned', label: 'Assigned' },
    { id: 'Resolved', label: 'Resolved' },
    { id: 'Closed', label: 'Closed' },
    { id: 'Dropped', label: 'Dropped' },
    { id: 'Duplicated', label: 'Duplicated' },
]

function severityClasses(s: Severity): string {
    switch (s) {
        case 'Critical': return 'bg-destructive/10 text-destructive'
        case 'High': return 'bg-amber-500/10 text-amber-600'
        case 'Medium': return 'bg-blue-500/10 text-blue-600'
        case 'Low': return 'bg-muted text-muted-foreground'
    }
}

// FB-03 v2 · inline quick action icons per row · matches prod tooltips:
// Submitted · "Triage" "Drop" "Mark Duplicate"
// Triaged   · "Assign" "Resolve" "Drop" "Mark Duplicate"
// Assigned  · "Resolve" "Close" "Promote to Jira"
// Terminal  · "Reopen"
interface QuickAction {
    icon: typeof Check
    label: string         // tooltip · matches prod text exactly
    target?: FeedbackState
    promoteJira?: boolean // FB-04 · sets the jira field on the feedback
    openAssign?: boolean  // opens the AssignFeedbackModal picker
    colorClass: string
    hoverBgClass: string
}

function quickActions(state: FeedbackState, alreadyInJira: boolean): QuickAction[] {
    switch (state) {
        case 'Submitted': return [
            { icon: Filter,       label: 'Triage',         target: 'Triaged',    colorClass: 'text-blue-600',         hoverBgClass: 'hover:bg-blue-500/10' },
            { icon: Trash2,       label: 'Drop',           target: 'Dropped',    colorClass: 'text-destructive',      hoverBgClass: 'hover:bg-destructive/10' },
            { icon: CopyIcon,     label: 'Mark Duplicate', target: 'Duplicated', colorClass: 'text-orange-600',       hoverBgClass: 'hover:bg-orange-500/10' },
        ]
        case 'Triaged': return [
            { icon: UserPlus,     label: 'Assign',         openAssign: true,     colorClass: 'text-blue-600',         hoverBgClass: 'hover:bg-blue-500/10' },
            { icon: Check,        label: 'Resolve',        target: 'Resolved',   colorClass: 'text-green-600',        hoverBgClass: 'hover:bg-green-500/10' },
            { icon: Trash2,       label: 'Drop',           target: 'Dropped',    colorClass: 'text-destructive',      hoverBgClass: 'hover:bg-destructive/10' },
            { icon: CopyIcon,     label: 'Mark Duplicate', target: 'Duplicated', colorClass: 'text-orange-600',       hoverBgClass: 'hover:bg-orange-500/10' },
        ]
        case 'Assigned': return [
            { icon: Check,        label: 'Resolve',        target: 'Resolved',   colorClass: 'text-green-600',        hoverBgClass: 'hover:bg-green-500/10' },
            { icon: XCircle,      label: 'Close',          target: 'Closed',     colorClass: 'text-muted-foreground', hoverBgClass: 'hover:bg-muted' },
            { icon: ExternalLink, label: alreadyInJira ? 'Open Jira' : 'Promote to Jira', promoteJira: true, colorClass: 'text-orange-600', hoverBgClass: 'hover:bg-orange-500/10' },
        ]
        case 'Resolved': return [
            { icon: RotateCcw,    label: 'Reopen',         target: 'Submitted',  colorClass: 'text-blue-600',         hoverBgClass: 'hover:bg-blue-500/10' },
        ]
        case 'Closed':
        case 'Dropped':
        case 'Duplicated': return [
            { icon: RotateCcw,    label: 'Reopen',         target: 'Submitted',  colorClass: 'text-blue-600',         hoverBgClass: 'hover:bg-blue-500/10' },
        ]
    }
}

// Synthetic display name + initials from email for the Submitted By column.
function displayNameFromEmail(email: string): { name: string; initials: string } {
    const handle = (email.includes('@') ? email.split('@')[0] : email).replace(/[._-]/g, ' ')
    const parts = handle.split(' ').filter(Boolean)
    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    const initials = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || 'U'
    return { name: name || email, initials }
}

// solidAvatarColor() ahora vive en components/team/teamMembers.ts (shared util).

// Relative time · accepts ISO timestamps + friendly "Jun 12, 2026" seeds.
function formatRelativeTime(input: string): string {
    if (!input) return '—'
    const parsed = new Date(input)
    if (isNaN(parsed.getTime())) return input
    const diffMs = Date.now() - parsed.getTime()
    if (diffMs < 0) return 'just now'
    const minutes = Math.floor(diffMs / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return parsed.toLocaleDateString()
}

function stateClasses(s: FeedbackState): string {
    switch (s) {
        case 'Submitted': return 'bg-blue-500/10 text-blue-600'
        case 'Triaged': return 'bg-amber-500/10 text-amber-600'
        case 'Assigned': return 'bg-blue-500/10 text-blue-600'
        case 'Resolved': return 'bg-green-500/10 text-green-600'
        default: return 'bg-muted text-muted-foreground'
    }
}

export default function FeedbackBoard({ onLogout, onNavigate, navbarSwitcher = true, navbarHiddenTabs, navbarTabBadges }: FeedbackBoardProps) {
    const [activeTab, setActiveTab] = useState('all')
    const [query, setQuery] = useState('')
    const [stateOverrides, setStateOverrides] = useState<Record<string, FeedbackState>>(() => loadStateOverrides())
    const [upvotes, setUpvotes] = useState<Record<string, number>>(() => loadUpvotes())
    const [jiraOverrides, setJiraOverrides] = useState<Record<string, string>>(() => loadJiraOverrides())
    const [assignedOverrides, setAssignedOverrides] = useState<Record<string, string>>(() => loadAssignedOverrides())
    const [assignTargetId, setAssignTargetId] = useState<string | null>(null)
    const [viewed, setViewed] = useState<Set<string>>(() => loadViewed(FEEDBACK.map(f => f.id)))
    const [submissions, setSubmissions] = useState<FeedbackItem[]>(() => loadSubmissions())
    const [comments, setComments] = useState<Record<string, FeedbackComment[]>>(() => {
        const persisted = loadComments()
        // Merge seed → persisted (persisted wins per id si ya hay overrides).
        const merged: Record<string, FeedbackComment[]> = { ...SEED_COMMENTS }
        for (const [id, list] of Object.entries(persisted)) merged[id] = list
        return merged
    })
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => { saveStateOverrides(stateOverrides) }, [stateOverrides])
    useEffect(() => { saveUpvotes(upvotes) }, [upvotes])
    useEffect(() => { saveJiraOverrides(jiraOverrides) }, [jiraOverrides])
    useEffect(() => { saveAssignedOverrides(assignedOverrides) }, [assignedOverrides])
    useEffect(() => { saveViewed(viewed) }, [viewed])
    useEffect(() => { saveComments(comments) }, [comments])

    // Re-load submissions on storage events · permite que el board se actualice
    // cuando el composer del otro tab/page hace submit en la misma session.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === SUBMISSIONS_KEY) setSubmissions(loadSubmissions())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    // Apply overrides from localStorage on top of seed + submitted items.
    const items = useMemo<FeedbackItem[]>(() => {
        const base = [...submissions, ...FEEDBACK]
        return base.map(f => {
            const next = { ...f }
            if (stateOverrides[f.id]) next.state = stateOverrides[f.id]
            if (jiraOverrides[f.id]) next.jira = jiraOverrides[f.id]
            if (assignedOverrides[f.id]) {
                const member = getTeamMember(assignedOverrides[f.id])
                if (member) next.assignedTo = { id: member.id, name: member.name, initials: member.initials }
            }
            return next
        })
    }, [stateOverrides, jiraOverrides, assignedOverrides, submissions])

    // FB-07 · group duplicates by (category + description normalized).
    const duplicateGroups = useMemo(() => buildDuplicateGroups(items), [items])

    const handleTransition = (id: string, next: FeedbackState) => {
        setStateOverrides(prev => ({ ...prev, [id]: next }))
    }

    const handleMeToo = (id: string) => {
        setUpvotes(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
    }

    const handleAssign = (member: TeamMember) => {
        if (!assignTargetId) return
        setAssignedOverrides(prev => ({ ...prev, [assignTargetId]: member.id }))
        // Si el feedback está en Submitted/Triaged · advance to Assigned.
        setStateOverrides(prev => {
            const current = prev[assignTargetId] ?? items.find(i => i.id === assignTargetId)?.state
            if (current === 'Submitted' || current === 'Triaged') {
                return { ...prev, [assignTargetId]: 'Assigned' }
            }
            return prev
        })
        setAssignTargetId(null)
    }

    const handlePromoteJira = (id: string) => {
        setJiraOverrides(prev => {
            if (prev[id]) return prev // ya promovido · no-op
            // Mock ticket id · prefix STRATA + sequential idx based on existing count.
            const next = { ...prev, [id]: `STRATA-${1000 + Object.keys(prev).length + 1}` }
            return next
        })
    }

    const markViewed = (id: string) => {
        setViewed(prev => prev.has(id) ? prev : new Set(prev).add(id))
    }

    const handleAddComment = (feedbackId: string, body: string, role: 'reporter' | 'expert' = 'expert') => {
        const author = role === 'expert' ? 'Diego Zuluaga' : 'Reynier Rivero'
        const email  = role === 'expert' ? 'diego.zuluaga@agenticdream.com' : 'reynier.rivero@agenticdream.com'
        const initials = role === 'expert' ? 'DZ' : 'RR'
        const c: FeedbackComment = {
            id: `c-${Date.now().toString(36)}`,
            author, authorEmail: email, initials, role,
            body: body.trim(),
            createdAt: new Date().toISOString(),
        }
        setComments(prev => ({ ...prev, [feedbackId]: [...(prev[feedbackId] ?? []), c] }))
    }

    // Per-tab total counts.
    const counts = useMemo(() => {
        const c: Record<string, number> = {
            all: items.length,
            jira: items.filter(f => f.jira).length,
        }
        for (const f of items) c[f.state] = (c[f.state] ?? 0) + 1
        return c
    }, [items])

    // Unread per tab · counted only when at least one matching item is unread.
    const unread = useMemo(() => {
        const u: Record<string, number> = { all: 0, jira: 0 }
        for (const f of items) {
            if (viewed.has(f.id)) continue
            u.all += 1
            if (f.jira) u.jira += 1
            u[f.state] = (u[f.state] ?? 0) + 1
        }
        return u
    }, [items, viewed])

    const filtered = useMemo(() => {
        return items.filter(f => {
            if (activeTab === 'jira' && !f.jira) return false
            if (activeTab !== 'all' && activeTab !== 'jira' && f.state !== activeTab) return false
            if (query.trim()) {
                const q = query.toLowerCase()
                if (!f.description.toLowerCase().includes(q) &&
                    !f.submittedBy.toLowerCase().includes(q) &&
                    !f.category.toLowerCase().includes(q)) return false
            }
            return true
        })
    }, [activeTab, query, items])

    const selected = useMemo(() => items.find(f => f.id === selectedId) ?? null, [items, selectedId])

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            <Navbar onLogout={onLogout} activeTab="Feedback" onNavigateToWorkspace={() => onNavigate('ocr-tracking')} onNavigate={onNavigate} leftSlot={navbarSwitcher ? <InlineExperienceSwitcher /> : undefined} hiddenTabs={navbarHiddenTabs} tabBadges={navbarTabBadges} />

            <div className="pt-24 px-4 max-w-screen-2xl mx-auto space-y-6">
                {/* TT.60 · breadcrumb dentro del content · parity con OCR/Comparisons. */}
                <div className="text-xs px-1">
                    <Breadcrumbs items={[
                        { label: 'Expert Hub', onClick: () => onNavigate('ocr-tracking') },
                        { label: 'Feedback Board', active: true },
                    ]} />
                </div>
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Header: title + funnel + search */}
                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                    Feedback Board
                                </h3>
                                {/* Funnel */}
                                <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                                    {FUNNEL.map(tab => {
                                        const unreadCount = unread[tab.id] ?? 0
                                        const totalCount = counts[tab.id] ?? 0
                                        const isActive = activeTab === tab.id
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 outline-none whitespace-nowrap ${
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                                                }`}
                                            >
                                                {tab.label}
                                                {unreadCount > 0 && (
                                                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-destructive text-destructive-foreground">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                                                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                                                }`}>
                                                    {totalCount}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search feedback…"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Inbox className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No feedback yet</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                When users submit feedback, rows will appear here live.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        {['Description', 'Category', 'Severity', 'State', 'Assigned To', 'Submitted By', 'Date', 'Jira', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(f => {
                                        const submitter = displayNameFromEmail(f.submittedBy)
                                        const isUnread = !viewed.has(f.id)
                                        const rowActions = quickActions(f.state, !!f.jira)
                                        return (
                                        <tr
                                            key={f.id}
                                            onClick={() => { setSelectedId(f.id); markViewed(f.id) }}
                                            className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${isUnread ? 'bg-blue-500/5' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="max-w-[360px]">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            title={f.description}
                                                            className="font-medium text-foreground truncate min-w-0 flex-1"
                                                        >
                                                            {f.description}
                                                        </span>
                                                        {duplicateGroups[f.id]?.groupSize > 1 && (
                                                            <span
                                                                title={`Reported by ${duplicateGroups[f.id].groupSize} users`}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0"
                                                            >
                                                                <AlertTriangle className="h-2.5 w-2.5" />
                                                                +{duplicateGroups[f.id].groupSize - 1} similar
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <span>{f.id}</span>
                                                        {upvotes[f.id] > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                                                · {upvotes[f.id]} me too
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{f.category}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityClasses(f.severity)}`}>
                                                    {f.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stateClasses(f.state)}`}>
                                                    {f.state}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {f.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-6 w-6 rounded-full ${solidAvatarColor(f.assignedTo.initials)} flex items-center justify-center text-[9px] font-bold text-white`}>
                                                            {f.assignedTo.initials}
                                                        </div>
                                                        <span className="text-foreground">{f.assignedTo.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        title={f.submittedBy}
                                                        className={`h-6 w-6 rounded-full ${solidAvatarColor(submitter.initials)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}
                                                    >
                                                        {submitter.initials}
                                                    </div>
                                                    <span className="text-foreground">{submitter.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatRelativeTime(f.date)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {f.jira ? (
                                                    <a
                                                        onClick={e => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {f.jira}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {rowActions.map(opt => {
                                                        const Icon = opt.icon
                                                        return (
                                                            <button
                                                                key={opt.label}
                                                                onClick={e => {
                                                                    e.stopPropagation()
                                                                    if (opt.openAssign) setAssignTargetId(f.id)
                                                                    else if (opt.promoteJira) handlePromoteJira(f.id)
                                                                    else if (opt.target) handleTransition(f.id, opt.target)
                                                                }}
                                                                title={opt.label}
                                                                aria-label={opt.label}
                                                                className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${opt.colorClass} ${opt.hoverBgClass}`}
                                                            >
                                                                <Icon className="h-4 w-4" />
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <FeedbackDetailModal
                isOpen={!!selected}
                onClose={() => setSelectedId(null)}
                feedback={selected}
                onTransition={handleTransition}
                duplicateGroupSize={selected ? duplicateGroups[selected.id]?.groupSize ?? 1 : 1}
                meTooCount={selected ? upvotes[selected.id] ?? 0 : 0}
                onMeToo={() => selected && handleMeToo(selected.id)}
                comments={selected ? comments[selected.id] ?? [] : []}
                onAddComment={(body, role) => selected && handleAddComment(selected.id, body, role)}
                onOpenAssign={(id) => setAssignTargetId(id)}
            />

            <AssignFeedbackModal
                isOpen={!!assignTargetId}
                onClose={() => setAssignTargetId(null)}
                onAssign={handleAssign}
            />
        </div>
    )
}
