// Seed tickets for the "My feedback Status" demo. Three items with varied
// state / severity / category so the empty state never shows and the demo
// looks alive from the first load. Only surfaced for the current user via
// `submittedBy === user.email` — the seed uses the demo user's email so the
// default logged-in session sees them.

import type { FeedbackItem, FeedbackComment } from './types'

/** Demo user's email · see AuthContext DEMO_ACCOUNTS. */
export const SEED_REPORTER_EMAIL = 'demo@agenticdream.com'
const SEED_REPORTER_NAME = 'Demo User'
const SEED_REPORTER_INITIALS = 'DU'

const SUPPORT_MEMBERS: Record<string, { name: string; email: string; initials: string }> = {
    'sofia': { name: 'Sofía Ramírez', email: 'sofia.ramirez@strata.com', initials: 'SR' },
    'liam': { name: 'Liam O\'Brien', email: 'liam.obrien@strata.com', initials: 'LO' },
}

/* ═══════════════════════════════════════════════════════════════════════
   Ticket 1 · Bug in OCR extraction · Assigned + rich thread (has unread reply)
   ═══════════════════════════════════════════════════════════════════════ */

const FB_SEED_001: FeedbackItem = {
    id: 'FB-SEED-001',
    description:
        'PO-1029 from Steelcase is missing 2 line items. The document has 8 rows but the extraction only picked up 6 · rows 4 and 5 (SKU 435A and 435B) never made it into the SIF.',
    category: 'Bug',
    severity: 'High',
    state: 'Assigned',
    submittedBy: SEED_REPORTER_EMAIL,
    date: '2026-06-28T14:22:00.000Z',
    experience: 'pdf-to-sif',
    workspace: 'quote-converter',
    context: {
        docId: 'OCR-003',
        vendor: 'Steelcase',
        docType: 'po',
        status: 'In Progress',
    },
    attachment: {
        name: 'PO-1029_Steelcase.pdf',
        type: 'PDF',
        sizeKB: 412,
    },
    assignedToName: 'Sofía Ramírez',
    updatedAt: '2026-07-06T11:15:00.000Z',
}

const FB_SEED_001_COMMENTS: FeedbackComment[] = [
    {
        id: 'c-001-1',
        author: SUPPORT_MEMBERS.sofia.name,
        authorEmail: SUPPORT_MEMBERS.sofia.email,
        initials: SUPPORT_MEMBERS.sofia.initials,
        role: 'expert',
        body: 'Thanks for flagging this. I can reproduce it on our end · looks like the parser is skipping rows whose SKU has a suffix letter. Investigating.',
        createdAt: '2026-06-29T09:41:00.000Z',
    },
    {
        id: 'c-001-2',
        author: SEED_REPORTER_NAME,
        authorEmail: SEED_REPORTER_EMAIL,
        initials: SEED_REPORTER_INITIALS,
        role: 'reporter',
        body: 'Good to hear you can reproduce it. I checked a couple more docs and PO-1031 seems to have the same issue with SKU 618C. Attaching in case it helps.',
        createdAt: '2026-06-29T10:20:00.000Z',
    },
    {
        id: 'c-001-3',
        author: SUPPORT_MEMBERS.sofia.name,
        authorEmail: SUPPORT_MEMBERS.sofia.email,
        initials: SUPPORT_MEMBERS.sofia.initials,
        role: 'expert',
        body: 'Confirmed · same root cause. Rolling out a fix to staging today, should hit prod by the end of the week. I\'ll re-run PO-1029 and PO-1031 automatically once it\'s deployed.',
        createdAt: '2026-07-06T11:15:00.000Z',
    },
]

/* ═══════════════════════════════════════════════════════════════════════
   Ticket 2 · Data quality discrepancy · Resolved with resolution note
   ═══════════════════════════════════════════════════════════════════════ */

const FB_SEED_002: FeedbackItem = {
    id: 'FB-SEED-002',
    description:
        'The ACK for PO-1027 shows quantities that don\'t match the original purchase order (5 units on the PO, 4 on the ACK) but the system didn\'t flag a discrepancy.',
    category: 'Data',
    severity: 'Medium',
    state: 'Resolved',
    submittedBy: SEED_REPORTER_EMAIL,
    date: '2026-06-15T16:04:00.000Z',
    experience: 'pdf-to-sif',
    workspace: 'quote-converter',
    context: {
        docId: 'OCR-007',
        vendor: 'AmTab',
        docType: 'ack',
        status: 'Completed',
    },
    assignedToName: 'Liam O\'Brien',
    jira: 'OCR-318',
    updatedAt: '2026-06-22T13:30:00.000Z',
}

const FB_SEED_002_COMMENTS: FeedbackComment[] = [
    {
        id: 'c-002-1',
        author: SUPPORT_MEMBERS.liam.name,
        authorEmail: SUPPORT_MEMBERS.liam.email,
        initials: SUPPORT_MEMBERS.liam.initials,
        role: 'expert',
        body: 'Nice catch. The reconciliation rule was only checking totals, not per-line quantities. Adding a per-line check now.',
        createdAt: '2026-06-16T08:12:00.000Z',
    },
    {
        id: 'c-002-2',
        author: SUPPORT_MEMBERS.liam.name,
        authorEmail: SUPPORT_MEMBERS.liam.email,
        initials: SUPPORT_MEMBERS.liam.initials,
        role: 'expert',
        body: 'Fixed and deployed. PO-1027 now shows a "Line qty mismatch" warning on the ACK card. Let me know if you spot any other cases we should cover.',
        createdAt: '2026-06-22T13:30:00.000Z',
    },
]

/* ═══════════════════════════════════════════════════════════════════════
   Ticket 3 · Feature request · Submitted (no reply yet, no unread)
   ═══════════════════════════════════════════════════════════════════════ */

const FB_SEED_003: FeedbackItem = {
    id: 'FB-SEED-003',
    description:
        'Would love a way to bulk-export the SIFs of every completed doc from a specific vendor in one zip. Right now I have to click each one and download individually.',
    category: 'Feature Request',
    severity: 'Low',
    state: 'Submitted',
    submittedBy: SEED_REPORTER_EMAIL,
    date: '2026-07-02T10:48:00.000Z',
    experience: 'pdf-to-sif',
    workspace: 'quote-converter',
    updatedAt: '2026-07-02T10:48:00.000Z',
}

const FB_SEED_003_COMMENTS: FeedbackComment[] = []

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */

export const SEED_USER_FEEDBACKS: FeedbackItem[] = [FB_SEED_001, FB_SEED_002, FB_SEED_003]

export const SEED_COMMENTS_BY_ID: Record<string, FeedbackComment[]> = {
    'FB-SEED-001': FB_SEED_001_COMMENTS,
    'FB-SEED-002': FB_SEED_002_COMMENTS,
    'FB-SEED-003': FB_SEED_003_COMMENTS,
}

/** IDs of seed tickets whose LAST comment is from the expert (unread until
 *  the user opens the detail modal). Used to bootstrap the unread badge on
 *  first visit so the notification UX has something to show. */
export const SEED_UNREAD_IDS: string[] = ['FB-SEED-001']
