import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Paperclip, Sparkles } from 'lucide-react'

// Ports the "Send feedback" modal from production quote-converter to expert-hub.
// Source · screenshots de Diego (2026-06-26) · adapted with PRD Fase B additions:
// - FB-11 · auto-attach transaction/doc context cuando abre desde DocumentReviewModal
// - FB-13 · suggested issues quick-select chips por category
// - FB-12 · paste-screenshot listener en textarea (clipboard image → base64 attachment)

export type FeedbackCategory = 'Bug' | 'Suggestion' | 'Data Quality' | 'Other'
export type FeedbackSeverity = 'Low' | 'Medium' | 'High'

export interface FeedbackContext {
    docId?: string
    vendor?: string
    docType?: string
    status?: string
    /** FB-06b · multi-select batch · cuando varios docs son flagged en una submission. */
    batchDocIds?: string[]
}

export interface FeedbackSubmission {
    category: FeedbackCategory
    severity?: FeedbackSeverity
    description: string
    attachment?: { name: string; sizeKB: number; type: string; dataUrl?: string }
    experience: string
    workspace: string
    context?: FeedbackContext
    submittedAt: string
}

interface FeedbackComposerModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (s: FeedbackSubmission) => void
    experienceLabel: string
    workspaceLabel: string
    /** When provided, modal shows the auto-attached context card · FB-11. */
    context?: FeedbackContext
}

const CATEGORIES: FeedbackCategory[] = ['Bug', 'Suggestion', 'Data Quality', 'Other']
const SEVERITIES: { value: FeedbackSeverity; helper: string }[] = [
    { value: 'Low',    helper: 'Minor inconvenience, workaround exists' },
    { value: 'Medium', helper: 'Affects workflow but not blocking' },
    { value: 'High',   helper: 'Blocks my work, needs urgent attention' },
]

// Suggested issues quick-select · FB-13 · pre-canned phrases por category.
const SUGGESTED_BY_CATEGORY: Record<FeedbackCategory, string[]> = {
    'Bug':           ['Line item missing', 'Wrong total amount', 'Vendor name not extracted', 'Modal hangs on submit'],
    'Suggestion':    ['Add bulk action', 'Export to CSV', 'Keyboard shortcut for save', 'Inline edit on table'],
    'Data Quality':  ['SKU mapped to wrong catalog', 'Price mismatch vs PO', 'Date format inconsistent', 'Duplicate line item'],
    'Other':         ['UI feels slow', 'Cannot find a feature', 'Need help with workflow', 'General feedback'],
}

const MAX_DESC = 4000
const MAX_FILE_MB = 10

export default function FeedbackComposerModal({
    isOpen, onClose, onSubmit, experienceLabel, workspaceLabel, context,
}: FeedbackComposerModalProps) {
    const [category, setCategory] = useState<FeedbackCategory | null>(null)
    const [severity, setSeverity] = useState<FeedbackSeverity | null>(null)
    const [description, setDescription] = useState('')
    const [attachment, setAttachment] = useState<{ file: File; dataUrl?: string } | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const canSubmit = !!category && description.trim().length > 0
    const suggestions = category ? SUGGESTED_BY_CATEGORY[category] : []

    // Reset form on close.
    const handleClose = () => {
        setCategory(null); setSeverity(null); setDescription(''); setAttachment(null)
        onClose()
    }

    const handleSubmit = () => {
        if (!canSubmit) return
        const submission: FeedbackSubmission = {
            category: category!,
            severity: severity ?? undefined,
            description: description.trim(),
            attachment: attachment ? {
                name: attachment.file.name,
                sizeKB: attachment.file.size / 1024,
                type: attachment.file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
                dataUrl: attachment.dataUrl,
            } : undefined,
            experience: experienceLabel,
            workspace: workspaceLabel,
            context,
            submittedAt: new Date().toISOString(),
        }
        onSubmit(submission)
        handleClose()
    }

    const handleFile = (f: File | null) => {
        if (!f) { setAttachment(null); return }
        if (f.size > MAX_FILE_MB * 1024 * 1024) { alert(`File exceeds ${MAX_FILE_MB}MB limit`); return }
        const ext = f.name.split('.').pop()?.toLowerCase()
        if (!ext || !['png', 'jpg', 'jpeg', 'pdf'].includes(ext)) {
            alert('Only PNG, JPG, PDF allowed'); return
        }
        // Read as base64 for inline preview (esp. paste-screenshot · FB-12).
        const reader = new FileReader()
        reader.onload = e => setAttachment({ file: f, dataUrl: e.target?.result as string })
        reader.onerror = () => setAttachment({ file: f })
        reader.readAsDataURL(f)
    }

    // FB-12 · Paste-screenshot listener · capture clipboard images cuando focus en textarea.
    useEffect(() => {
        if (!isOpen) return
        const onPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile()
                    if (file) {
                        // Synthesize a filename since clipboard images are usually unnamed.
                        const ext = items[i].type.split('/')[1] || 'png'
                        const named = new File([file], `pasted-screenshot.${ext}`, { type: items[i].type })
                        handleFile(named)
                        e.preventDefault()
                    }
                    return
                }
            }
        }
        window.addEventListener('paste', onPaste)
        return () => window.removeEventListener('paste', onPaste)
    }, [isOpen])

    const appendToDescription = (snippet: string) => {
        setDescription(prev => {
            const sep = prev.trim().length === 0 ? '' : (prev.endsWith('\n') ? '' : '\n')
            return (prev + sep + snippet).slice(0, MAX_DESC)
        })
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            {/* TT.61 · Diego 2026-09-08 · z-[210] > DocumentReviewModal z-[200] · antes
                 z-50 quedaba debajo cuando se abría desde adentro del DocumentReview. */}
            <Dialog as="div" className="relative z-[210]" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150"  leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-card text-left shadow-2xl border border-border flex flex-col max-h-[90vh]">
                                {/* HEADER */}
                                <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">Send feedback</h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Report a bug, suggest an improvement, or flag a data quality issue.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* BODY · scrollable form */}
                                <div className="px-6 py-2 space-y-6 overflow-y-auto flex-1">
                                    {/* Category · required */}
                                    <fieldset>
                                        <legend className="text-sm font-semibold text-foreground mb-3">
                                            Category <span className="text-destructive">*</span>
                                        </legend>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                            {CATEGORIES.map(c => (
                                                <label key={c} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                                                    <input
                                                        type="radio"
                                                        name="category"
                                                        value={c}
                                                        checked={category === c}
                                                        onChange={() => setCategory(c)}
                                                        className="h-4 w-4 accent-primary"
                                                    />
                                                    {c}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Suggested issues · FB-13 · chips visible once a category is selected */}
                                    {suggestions.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Common {category?.toLowerCase()} reports · click to prefill
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {suggestions.map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => appendToDescription(s)}
                                                        className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted text-xs font-medium text-foreground border border-border transition-colors"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Severity · optional */}
                                    <fieldset>
                                        <legend className="text-sm font-semibold text-foreground mb-3">
                                            Severity <span className="text-muted-foreground font-normal">(optional)</span>
                                        </legend>
                                        <div className="space-y-2">
                                            {SEVERITIES.map(s => (
                                                <label
                                                    key={s.value}
                                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        severity === s.value
                                                            ? 'border-foreground/40 bg-muted/40'
                                                            : 'border-border hover:bg-muted/30'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="severity"
                                                        value={s.value}
                                                        checked={severity === s.value}
                                                        onChange={() => setSeverity(s.value)}
                                                        className="h-4 w-4 mt-0.5 accent-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-foreground">{s.value}</div>
                                                        <div className="text-xs text-muted-foreground">{s.helper}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Description · required */}
                                    <div>
                                        <label className="text-sm font-semibold text-foreground block mb-2">
                                            Description <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                value={description}
                                                onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                                                rows={5}
                                                placeholder="What happened? What did you expect?&#10;&#10;Tip: include steps to reproduce if it's a bug.&#10;You can also paste a screenshot from clipboard (Ctrl/Cmd+V)."
                                                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                            />
                                            <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground tabular-nums">
                                                {description.length}/{MAX_DESC}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Attach · optional · dropzone + paste preview */}
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                                            <Paperclip className="h-4 w-4" />
                                            Attach a screenshot or file <span className="text-muted-foreground font-normal">(optional)</span>
                                        </div>
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={e => {
                                                e.preventDefault(); setDragOver(false)
                                                handleFile(e.dataTransfer.files?.[0] ?? null)
                                            }}
                                            className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                                                dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                                            }`}
                                        >
                                            {attachment ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    {attachment.dataUrl && attachment.file.type.startsWith('image/') && (
                                                        <img src={attachment.dataUrl} alt="" className="h-16 w-16 object-cover rounded-md border border-border" />
                                                    )}
                                                    <div className="text-left">
                                                        <div className="text-sm font-medium text-foreground">{attachment.file.name}</div>
                                                        <div className="text-xs text-muted-foreground">{(attachment.file.size / 1024).toFixed(1)} KB</div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachment(null)}
                                                            className="text-xs text-destructive hover:underline mt-1"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-3">
                                                    <label className="cursor-pointer">
                                                        <span className="inline-flex items-center px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                                                            Choose file
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept=".png,.jpg,.jpeg,.pdf"
                                                            onChange={e => handleFile(e.target.files?.[0] ?? null)}
                                                            className="sr-only"
                                                        />
                                                    </label>
                                                    <span className="text-sm text-muted-foreground">or drag &amp; drop · or paste</span>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-3">Max {MAX_FILE_MB}MB · PNG, JPG, PDF</p>
                                        </div>
                                    </div>

                                    {/* Auto-attached context · FB-11 · only when context is provided */}
                                    {context && (context.docId || context.vendor || (context.batchDocIds && context.batchDocIds.length > 0)) && (
                                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                                {context.batchDocIds && context.batchDocIds.length > 0
                                                    ? `Batch context · ${context.batchDocIds.length} documents flagged`
                                                    : 'Attached context · linked automatically'}
                                            </div>
                                            {context.batchDocIds && context.batchDocIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {context.batchDocIds.map(id => (
                                                        <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-card border border-border text-[11px] font-mono text-foreground">
                                                            {id}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                                    {context.docId && (
                                                        <><span className="text-muted-foreground">Document</span><span className="text-foreground font-medium">{context.docId}</span></>
                                                    )}
                                                    {context.vendor && (
                                                        <><span className="text-muted-foreground">Vendor</span><span className="text-foreground font-medium">{context.vendor}</span></>
                                                    )}
                                                    {context.docType && (
                                                        <><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{context.docType}</span></>
                                                    )}
                                                    {context.status && (
                                                        <><span className="text-muted-foreground">Status</span><span className="text-foreground font-medium">{context.status}</span></>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Linked experience · always shown */}
                                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                            Your feedback will be linked to
                                        </div>
                                        <div className="text-sm font-semibold text-foreground">{experienceLabel}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            Workspace: <span className="font-medium text-foreground">{workspaceLabel}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-card">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-5 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={!canSubmit}
                                        className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Submit feedback
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
