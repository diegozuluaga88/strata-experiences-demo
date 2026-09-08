// TT.44 · Diego 2026-09-08 · Generate report button para Team View.
// Estados: idle → loading (~800ms + PDF build) → done. Al done abre el
// PDF en una nueva pestaña (Blob URL) · toast success delegado al parent.

import { useState } from 'react'
import { FileDown, Loader2, CheckCircle2 } from 'lucide-react'
import { generateTeamReportPdf, type TeamReportData } from '../../../utils/generateTeamReportPdf'

interface Props {
    data: TeamReportData
    onGenerated?: (kind: 'success' | 'error', message: string) => void
}

type State = 'idle' | 'loading' | 'done'

export default function GenerateReportButton({ data, onGenerated }: Props) {
    const [state, setState] = useState<State>('idle')

    const handleClick = async () => {
        if (state === 'loading') return
        setState('loading')
        try {
            // Simulate ~800ms of "generating" for UX polish · concurrent con PDF build.
            const [blob] = await Promise.all([
                generateTeamReportPdf(data),
                new Promise(r => setTimeout(r, 800)),
            ])
            const url = URL.createObjectURL(blob)
            const win = window.open(url, '_blank')
            // Revoke URL after the tab has had a chance to load it.
            setTimeout(() => URL.revokeObjectURL(url), 60_000)
            setState('done')
            if (win) {
                onGenerated?.('success', `Report opened in a new tab · week of ${data.weekLabel}`)
            } else {
                onGenerated?.('success', `Report ready · pop-up blocked, click the button again to download`)
            }
            setTimeout(() => setState('idle'), 1600)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not generate the report'
            onGenerated?.('error', message)
            setState('idle')
        }
    }

    const Icon = state === 'loading' ? Loader2 : state === 'done' ? CheckCircle2 : FileDown
    const label = state === 'loading' ? 'Generating report…'
        : state === 'done' ? 'Opened in new tab'
        : 'Generate report'

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={state === 'loading'}
            className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold px-3.5 py-2 shadow-sm transition-colors ${
                state === 'done'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
            title="Build a PDF weekly report of the team · opens in a new tab for preview"
        >
            <Icon className={`h-4 w-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
            {label}
        </button>
    )
}
