// Hook · exposes the current user's feedback tickets (seed + submissions
// from the composer), the comment thread per ticket, and the unread badge
// counter for the navbar dropdown. Everything lives in localStorage.

import { useCallback, useEffect, useMemo, useState } from 'react'
// SOURCE: quote-converter/src/feedback/useUserFeedbacks.ts · lift S4.a
import { useAuth } from '../../../../../context/AuthContext'
import type { FeedbackSubmission } from './FeedbackComposerModal'
import {
    mapLegacyCategory,
    mapLegacySeverity,
    type FeedbackComment,
    type FeedbackItem,
} from './types'
import {
    SEED_COMMENTS_BY_ID,
    SEED_REPORTER_EMAIL,
    SEED_UNREAD_IDS,
    SEED_USER_FEEDBACKS,
} from './seedUserFeedbacks'

/* ═══════════════════════════════════════════════════════════════════════
   Storage keys · scoped al proyecto quote-converter para no colisionar con
   los del expert-hub que corren en otro dominio.
   ═══════════════════════════════════════════════════════════════════════ */

const SUBMISSIONS_KEY = 'quote-converter.feedback.submissions'
const COMMENTS_KEY = 'quote-converter.feedback.comments'
const VIEWED_KEY = 'quote-converter.feedback.viewed'

/* ═══════════════════════════════════════════════════════════════════════
   PersistedSubmission · shape del JSON en localStorage. El OCRTracking hoy
   guarda el shape del composer + un id agregado. El enrichment de Fase 1d
   suma `submittedBy` y `state`.
   ═══════════════════════════════════════════════════════════════════════ */

interface PersistedSubmission extends FeedbackSubmission {
    id?: string
    /** Fase 1d · email del reporter (viene del AuthContext al submit). */
    submittedBy?: string
    /** Fase 1d · siempre 'Submitted' al momento del submit. */
    state?: 'Submitted'
}

/* ═══════════════════════════════════════════════════════════════════════
   Mapping · PersistedSubmission → FeedbackItem
   ═══════════════════════════════════════════════════════════════════════ */

function submissionToItem(sub: PersistedSubmission, fallbackEmail: string): FeedbackItem {
    return {
        id: sub.id ?? `FB-${Date.now().toString(36)}`,
        description: sub.description,
        category: mapLegacyCategory(sub.category),
        severity: mapLegacySeverity(sub.severity),
        state: sub.state ?? 'Submitted',
        submittedBy: (sub.submittedBy ?? fallbackEmail).toLowerCase(),
        date: sub.submittedAt,
        experience: sub.experience,
        workspace: sub.workspace,
        context: sub.context,
        attachment: sub.attachment,
        updatedAt: sub.submittedAt,
    }
}

/* ═══════════════════════════════════════════════════════════════════════
   Storage IO · defensivo · nunca throw · silent fallback a []
   ═══════════════════════════════════════════════════════════════════════ */

function readSubmissions(): PersistedSubmission[] {
    try {
        const raw = localStorage.getItem(SUBMISSIONS_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as PersistedSubmission[]) : []
    } catch {
        return []
    }
}

function readComments(): Record<string, FeedbackComment[]> {
    try {
        const raw = localStorage.getItem(COMMENTS_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return typeof parsed === 'object' && parsed !== null ? parsed : {}
    } catch {
        return {}
    }
}

function writeComments(map: Record<string, FeedbackComment[]>) {
    try {
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(map))
    } catch { /* quota / private mode · noop */ }
}

function readViewed(): Set<string> {
    try {
        const raw = localStorage.getItem(VIEWED_KEY)
        if (!raw) return new Set()
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set()
    } catch {
        return new Set()
    }
}

function writeViewed(set: Set<string>) {
    try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify([...set]))
    } catch { /* noop */ }
}

/** Bootstrap · en cada mount asegura el shape del `viewed` set:
 *  - Los seed tickets que NO están en `SEED_UNREAD_IDS` quedan marcados
 *    como vistos (no muestran badge unread — su thread ya fue cerrado
 *    o no tiene reply del support).
 *  - Los seed tickets que SÍ están en `SEED_UNREAD_IDS` (los que la seed
 *    quiere que aparezcan "no vistos" al demo) se DESMARCAN del viewed
 *    en cada mount, para que el badge unread se restaure al recargar la
 *    página. Esta es una decisión de UX del demo (Diego 2026-07-08) —
 *    permite mostrar la notificación una y otra vez sin resetear
 *    manualmente el localStorage.
 *  - Comments diff persistidos de submissions reales (no seed) se
 *    respetan como antes. */
function bootstrapUnreadFromSeeds(viewed: Set<string>): Set<string> {
    const next = new Set(viewed)
    for (const item of SEED_USER_FEEDBACKS) {
        if (SEED_UNREAD_IDS.includes(item.id)) {
            next.delete(item.id) // reset badge on reload
        } else {
            next.add(item.id)
        }
    }
    writeViewed(next)
    return next
}

/* ═══════════════════════════════════════════════════════════════════════
   Utility · dado el map de comments merged (seed + persisted) y el set
   `viewed`, devuelve la lista de feedback IDs con "reply unread". Un ticket
   tiene reply unread ⇔ tiene al menos un comment de rol 'expert' Y el
   ticket ID no está en el set de vistos.
   ═══════════════════════════════════════════════════════════════════════ */

function computeUnreadIds(
    commentsById: Record<string, FeedbackComment[]>,
    viewed: Set<string>,
): string[] {
    const unread: string[] = []
    for (const [id, comments] of Object.entries(commentsById)) {
        if (viewed.has(id)) continue
        const hasExpertReply = comments.some(c => c.role === 'expert')
        if (hasExpertReply) unread.push(id)
    }
    return unread
}

/* ═══════════════════════════════════════════════════════════════════════
   Hook · lee todo al mount, listenea storage-events para sync cross-tab,
   expone helpers para el detail modal y la navbar.
   ═══════════════════════════════════════════════════════════════════════ */

export interface UseUserFeedbacksReturn {
    /** Todos los tickets del usuario actual · seed + submissions. */
    feedbacks: FeedbackItem[]
    /** Map completo de comments · para lookups del detail modal. */
    commentsById: Record<string, FeedbackComment[]>
    /** Comments de un ticket específico · ordenados por createdAt asc. */
    getComments: (feedbackId: string) => FeedbackComment[]
    /** Añade un comment como reporter (el user actual) y persiste. */
    addComment: (feedbackId: string, body: string) => void
    /** Marca un ticket como visto · limpia el unread badge para ese ticket. */
    markAsViewed: (feedbackId: string) => void
    /** IDs con reply unread · usado para el highlight de row en la tabla. */
    unreadIds: Set<string>
    /** Contador para el badge del navbar dropdown. */
    unreadCount: number
}

export function useUserFeedbacks(): UseUserFeedbacksReturn {
    const { user } = useAuth()
    const currentEmail = (user?.email ?? '').toLowerCase()

    const [submissions, setSubmissions] = useState<PersistedSubmission[]>(() => readSubmissions())
    const [commentsById, setCommentsById] = useState<Record<string, FeedbackComment[]>>(() => {
        const persisted = readComments()
        // Merge con seed · persisted wins para ticket IDs ya editados.
        const merged: Record<string, FeedbackComment[]> = { ...SEED_COMMENTS_BY_ID }
        for (const [id, list] of Object.entries(persisted)) {
            merged[id] = list
        }
        return merged
    })
    const [viewed, setViewed] = useState<Set<string>>(() => bootstrapUnreadFromSeeds(readViewed()))

    // Re-sync al montar y ante cambios en localStorage disparados por otras
    // tabs (submits desde el composer, por ejemplo).
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === SUBMISSIONS_KEY) setSubmissions(readSubmissions())
            if (e.key === COMMENTS_KEY) {
                const persisted = readComments()
                setCommentsById({ ...SEED_COMMENTS_BY_ID, ...persisted })
            }
            if (e.key === VIEWED_KEY) setViewed(readViewed())
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [])

    /* Materialize · seed + submissions filtered por current user email. */
    const feedbacks = useMemo<FeedbackItem[]>(() => {
        const items: FeedbackItem[] = []

        // Seed items · datos de demo genéricos, se adoptan al user actual
        // sea quien sea (demo@agenticdream.com, test@goavanto.com, etc.).
        // Sin esto, un tenant/user distinto al hard-coded del seed veía
        // empty state incluso con la seed cargada · issue reportado por
        // Diego 2026-07-09 al probar Vercel logueado como Test User.
        if (currentEmail) {
            for (const item of SEED_USER_FEEDBACKS) {
                items.push({ ...item, submittedBy: currentEmail })
            }
        }

        // Submissions del composer · siempre son del user actual (el submit
        // los enriquece con user.email al momento del guardado, pero
        // defensivamente filtramos también acá).
        for (const sub of submissions) {
            const item = submissionToItem(sub, currentEmail)
            if (item.submittedBy === currentEmail || !sub.submittedBy) {
                items.push(item)
            }
        }

        // Dedupe por ID (defensivo · un submit con id ya en el seed no debería
        // pasar, pero por si acaso).
        const seen = new Set<string>()
        const deduped = items.filter(it => {
            if (seen.has(it.id)) return false
            seen.add(it.id)
            return true
        })

        // Sort por updatedAt desc · lo más reciente primero.
        deduped.sort((a, b) => (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date))
        return deduped
    }, [submissions, currentEmail])

    // Bootstrap seed also marks the fallback SEED_REPORTER_EMAIL user, so if
    // the demo user is logged in they see the seed unread state coherent.
    // Additionally · si el email logueado no matchea SEED_REPORTER_EMAIL, el
    // set de viewed simplemente no contiene entradas para tickets ajenos.
    void SEED_REPORTER_EMAIL

    const getComments = useCallback((feedbackId: string): FeedbackComment[] => {
        const list = commentsById[feedbackId] ?? []
        return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }, [commentsById])

    const addComment = useCallback((feedbackId: string, body: string) => {
        const trimmed = body.trim()
        if (!trimmed) return
        const nowIso = new Date().toISOString()
        const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'You'
        const initials = displayName
            .split(/\s+/)
            .map((word: string) => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
        const newComment: FeedbackComment = {
            id: `c-${feedbackId}-${Date.now().toString(36)}`,
            author: displayName,
            authorEmail: currentEmail,
            initials,
            role: 'reporter',
            body: trimmed,
            createdAt: nowIso,
        }
        setCommentsById(prev => {
            const next = { ...prev }
            const list = next[feedbackId] ? [...next[feedbackId]] : []
            list.push(newComment)
            next[feedbackId] = list
            // Persist only the diff vs seed · pattern espejo del expert-hub.
            const persistedDiff: Record<string, FeedbackComment[]> = {}
            for (const [id, comments] of Object.entries(next)) {
                const seedList = SEED_COMMENTS_BY_ID[id] ?? []
                if (comments.length !== seedList.length) {
                    persistedDiff[id] = comments
                } else {
                    // Same length · check if any is not from seed.
                    const isDiff = comments.some((c, i) => c.id !== seedList[i]?.id)
                    if (isDiff) persistedDiff[id] = comments
                }
            }
            writeComments(persistedDiff)
            return next
        })
    }, [user, currentEmail])

    const markAsViewed = useCallback((feedbackId: string) => {
        setViewed(prev => {
            if (prev.has(feedbackId)) return prev
            const next = new Set(prev)
            next.add(feedbackId)
            writeViewed(next)
            return next
        })
    }, [])

    const unreadIds = useMemo(() => new Set(computeUnreadIds(commentsById, viewed)), [commentsById, viewed])

    // Solo cuenta unreads de tickets que le pertenecen al user actual.
    const unreadCount = useMemo(() => {
        let count = 0
        const feedbackIds = new Set(feedbacks.map(f => f.id))
        for (const id of unreadIds) {
            if (feedbackIds.has(id)) count++
        }
        return count
    }, [unreadIds, feedbacks])

    return {
        feedbacks,
        commentsById,
        getComments,
        addComment,
        markAsViewed,
        unreadIds,
        unreadCount,
    }
}
