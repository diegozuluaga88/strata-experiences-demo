// TT.1 · Diego 2026-09-03 · Task type dropdown (admin-owned list).
// Two-field pattern per Timely: keep memo free-form + this dropdown
// carries a manager-controlled taxonomy with completion states
// suffixed (v1 · v2 · complete). See pain #4 in the benchmark MD.

export type TaskTypeGroup = 'design' | 'meetings' | 'admin' | 'time-off'

export interface TaskType {
    id: string
    label: string
    group: TaskTypeGroup
    /** If true, the label carries a completion-state suffix that the
     *  form appends at save time (e.g. "Block plan · v1"). */
    supportsCompletionState?: boolean
    /** Billable by default when this task type is picked.
     *  Designer can override in the form. */
    defaultBillable: boolean
}

export const TASK_TYPES: TaskType[] = [
    // Design work (billable · supports v1/v2/complete states)
    { id: 'block-plan',    label: 'Block plan',           group: 'design',   supportsCompletionState: true, defaultBillable: true },
    { id: 'floor-plan',    label: 'Floor plan',           group: 'design',   supportsCompletionState: true, defaultBillable: true },
    { id: 'powerpoint',    label: 'PowerPoint deck',      group: 'design',   supportsCompletionState: true, defaultBillable: true },
    { id: 'renderings',    label: 'Renderings',           group: 'design',   supportsCompletionState: true, defaultBillable: true },
    { id: 'spec-sheets',   label: 'Spec sheets',          group: 'design',   supportsCompletionState: true, defaultBillable: true },
    { id: 'client-review', label: 'Client review prep',   group: 'design',   defaultBillable: true },
    { id: 'site-visit',    label: 'Site visit',           group: 'design',   defaultBillable: true },
    // Meetings (billable if project-linked)
    { id: 'kickoff',       label: 'Project kickoff',      group: 'meetings', defaultBillable: true },
    { id: 'internal-mtg',  label: 'Internal team meeting', group: 'meetings', defaultBillable: false },
    { id: 'client-mtg',    label: 'Client meeting',       group: 'meetings', defaultBillable: true },
    // Admin (internal · non-billable)
    { id: 'training',      label: 'Training',             group: 'admin',    defaultBillable: false },
    { id: 'onboarding',    label: 'Onboarding',           group: 'admin',    defaultBillable: false },
    { id: 'downtime',      label: 'Downtime',             group: 'admin',    defaultBillable: false },
    { id: 'admin',         label: 'Admin',                group: 'admin',    defaultBillable: false },
    // Time off (non-billable, distinct group for reporting)
    { id: 'holiday',       label: 'Holiday',              group: 'time-off', defaultBillable: false },
    { id: 'pto',           label: 'PTO',                  group: 'time-off', defaultBillable: false },
    { id: 'sick',          label: 'Sick',                 group: 'time-off', defaultBillable: false },
]

export type CompletionState = 'v1' | 'v2' | 'v3' | 'complete'
export const COMPLETION_STATES: readonly CompletionState[] = ['v1', 'v2', 'v3', 'complete']

export function formatTaskLabel(taskType: TaskType, completionState?: CompletionState): string {
    if (!taskType.supportsCompletionState || !completionState) return taskType.label
    return `${taskType.label} · ${completionState}`
}

export function getTaskType(id: string | undefined | null): TaskType | null {
    if (!id) return null
    return TASK_TYPES.find(t => t.id === id) ?? null
}

// Groups shown in the dropdown, in order.
export const GROUP_ORDER: readonly TaskTypeGroup[] = ['design', 'meetings', 'admin', 'time-off']
export const GROUP_LABEL: Record<TaskTypeGroup, string> = {
    design: 'Design',
    meetings: 'Meetings',
    admin: 'Admin',
    'time-off': 'Time off',
}
