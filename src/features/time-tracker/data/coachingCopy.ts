// TT.1 · Diego 2026-09-03 · Coaching copy library.
// Locked at project level: every user-facing message about outliers,
// warnings, or alerts MUST come from here to enforce the coaching-vs-
// surveillance tone (see wurkwel-benchmark-2026-09-03.md · "Insight
// cultural crítico"). Never inline copy elsewhere · fail loud if this
// file grows drift.
//
// Rule of thumb: if a designer or manager would read the message and
// feel policed, rewrite it as a check-in prompt.

export interface OutlierContext {
    designerName: string
    hoursLogged: number
    projectName: string
    hoursAboveAvg: number
}

export interface MissingTimeContext {
    count: number
    names: string[]
}

export interface TrainingGapContext {
    designerName: string
    taskType: string
    velocityDelta: number
    weeks: number
    fastestPeer?: string
}

export interface OverworkContext {
    designerName: string
    capacityPercent: number
}

export interface DeliverableContext {
    salesRepName: string
    projectName: string
    undoWindowSeconds: number
}

export const coachingCopy = {
    outlierDetected: (c: OutlierContext) =>
        `${c.designerName} logged ${c.hoursLogged.toFixed(1)}h on ${c.projectName} — ${c.hoursAboveAvg.toFixed(1)}h above their 4-week avg. Worth a check-in?`,

    missingTimeReminder: (c: MissingTimeContext) => {
        if (c.count === 0) return 'Everyone finished this week.'
        if (c.count === 1) return `${c.names[0]} hasn't finished this week. Send a friendly nudge?`
        return `${c.count} designers haven't finished this week. Send a friendly nudge?`
    },

    trainingGapDetected: (c: TrainingGapContext) => {
        const base = `${c.designerName}'s ${c.taskType} velocity trending ${c.velocityDelta > 0 ? '+' : ''}${c.velocityDelta}% over ${c.weeks} weeks.`
        return c.fastestPeer
            ? `${base} Might be worth pairing with ${c.fastestPeer}.`
            : `${base} Worth a chat.`
    },

    overworkAlert: (c: OverworkContext) =>
        `${c.designerName} is at ${c.capacityPercent}% capacity this week — check if scope needs adjustment or workload balance.`,

    deliverableMarkedComplete: (c: DeliverableContext) =>
        `Marked complete · will notify ${c.salesRepName} on ${c.projectName} in ${c.undoWindowSeconds}s.`,

    deliverableSent: (c: DeliverableContext) =>
        `Email sent to ${c.salesRepName} · project ${c.projectName}.`,

    deliverableUndone: (c: DeliverableContext) =>
        `Undone. ${c.salesRepName} was not notified.`,

    promptTaskTypeMissing: () =>
        `Save without a Task Type? Adding one helps the team spot trends.`,

    saveStateIdle: () => `Not saved`,
    saveStateSaving: () => `Saving…`,
    saveStateSaved: (secondsAgo: number) =>
        secondsAgo <= 3 ? `Saved just now` : `Saved ${secondsAgo}s ago`,
} as const

// Attention-needed hero card · priority order per plan.
export type AttentionKind = 'missing-time' | 'outlier' | 'training-gap'
export const ATTENTION_PRIORITY: readonly AttentionKind[] = ['missing-time', 'outlier', 'training-gap']
