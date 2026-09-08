// Feedback types · shape unificado para la vista "My feedback Status".
// Portado del data model de expert-hub (FeedbackBoard.tsx) y adaptado al rol
// usuario en quote-converter. La lógica de mapping desde el legacy
// `FeedbackSubmission` del composer vive en `mapping.ts` (importado por el hook).

// SOURCE: quote-converter/src/feedback/types.ts · lift para strata-experiences-demo S4.a
import type { FeedbackCategory, FeedbackContext, FeedbackSeverity } from './FeedbackComposerModal'

/* ═══════════════════════════════════════════════════════════════════════
   Enums (mirror del expert-hub · silver-canonical del feedback flow)
   ═══════════════════════════════════════════════════════════════════════ */

export type FeedbackState =
    | 'Submitted'   // se recibió, en cola para triage
    | 'Triaged'     // categorizado por soporte, aún no asignado
    | 'Assigned'    // team member trabajando
    | 'Resolved'    // fix desplegado
    | 'Closed'      // resuelto y confirmado / cerrado sin fix
    | 'Dropped'     // no aplica (no era un problema, out of scope)
    | 'Duplicated'  // agrupado bajo otro ticket

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export type Category = 'Bug' | 'Feature Request' | 'UI/UX' | 'Data' | 'Performance'

/** Roles del thread · reporter = user actual · expert = support team */
export type CommentRole = 'reporter' | 'expert'

/* ═══════════════════════════════════════════════════════════════════════
   Interfaces principales
   ═══════════════════════════════════════════════════════════════════════ */

export interface FeedbackAttachment {
    name: string
    type: string     // 'PDF' | 'PNG' | ...
    sizeKB: number
    dataUrl?: string
}

export interface FeedbackItem {
    /** 'FB-{timestamp}' o 'FB-SEED-XXX' para tickets pre-armados de demo. */
    id: string
    description: string
    category: Category
    severity: Severity
    state: FeedbackState
    /** email del reporter · filter key para la vista "mis tickets". */
    submittedBy: string
    /** ISO string (submittedAt del composer o createdAt del seed). */
    date: string
    /** 'pdf-to-sif', 'quote-converter', etc · qué área de la app. */
    experience?: string
    workspace?: string
    context?: FeedbackContext
    attachment?: FeedbackAttachment
    /** Read-only badge · si el team promovió a Jira ('OCR-318'). */
    jira?: string
    /** Read-only badge · si el team ya asignó a alguien. */
    assignedToName?: string
    /** Timestamp del último evento (creación o último comment). Se usa para
     *  ordenar la tabla por "Last update" desc. */
    updatedAt: string
}

export interface FeedbackComment {
    id: string
    author: string       // display name
    authorEmail: string  // email del autor (el user actual o un support member)
    initials: string     // fallback para avatar sin foto
    role: CommentRole
    body: string
    createdAt: string    // ISO timestamp
}

/* ═══════════════════════════════════════════════════════════════════════
   Mapping helpers · legacy FeedbackSubmission ⇢ FeedbackItem silver
   ═══════════════════════════════════════════════════════════════════════ */

/** Category mapping · el composer tiene 4 categorías, el modelo silver tiene 5.
 *  Suggestion → Feature Request, Data Quality → Data, Other → Bug (fallback
 *  conservador para que aparezca como issue accionable). */
const CATEGORY_MAP: Record<FeedbackCategory, Category> = {
    'Bug': 'Bug',
    'Suggestion': 'Feature Request',
    'Data Quality': 'Data',
    'Other': 'Bug',
}

export function mapLegacyCategory(cat: FeedbackCategory): Category {
    return CATEGORY_MAP[cat] ?? 'Bug'
}

/** Severity mapping · el composer solo tiene Low/Medium/High. Critical es
 *  reservado para seed items pre-armados. Legacy `undefined` cae en 'Medium'. */
export function mapLegacySeverity(sev: FeedbackSeverity | undefined): Severity {
    if (sev === 'High') return 'High'
    if (sev === 'Medium') return 'Medium'
    if (sev === 'Low') return 'Low'
    return 'Medium'
}

/* ═══════════════════════════════════════════════════════════════════════
   State buckets · para los 3 tabs (All / Open / Resolved)
   ═══════════════════════════════════════════════════════════════════════ */

export type FeedbackTab = 'all' | 'open' | 'resolved'

const OPEN_STATES: FeedbackState[] = ['Submitted', 'Triaged', 'Assigned']
const RESOLVED_STATES: FeedbackState[] = ['Resolved', 'Closed', 'Dropped', 'Duplicated']

export function bucketForTab(state: FeedbackState, tab: FeedbackTab): boolean {
    if (tab === 'all') return true
    if (tab === 'open') return OPEN_STATES.includes(state)
    return RESOLVED_STATES.includes(state)
}

/** Helper text mostrado bajo el state chip en el detail modal · da contexto
 *  humano de "qué significa cada estado" para el user (no experto). */
export function stateHelperText(state: FeedbackState): string {
    switch (state) {
        case 'Submitted':
            return 'We received your feedback and it\'s queued for triage.'
        case 'Triaged':
            return 'The support team has reviewed your ticket and is planning a response.'
        case 'Assigned':
            return 'A team member is actively working on this.'
        case 'Resolved':
            return 'This has been fixed. Let us know if you need anything else.'
        case 'Closed':
            return 'This ticket is closed.'
        case 'Dropped':
            return 'The team determined this doesn\'t require action.'
        case 'Duplicated':
            return 'This was grouped under another ticket for tracking.'
    }
}
