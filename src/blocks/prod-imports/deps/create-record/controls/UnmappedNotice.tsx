import { Ban } from 'lucide-react'
import type { PreflightField } from '../types'

interface UnmappedNoticeProps {
    field: PreflightField
}

export default function UnmappedNotice({ field }: UnmappedNoticeProps) {
    return (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 border border-dashed border-border px-3 py-2">
            <Ban className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-[12px] text-muted-foreground leading-5">
                This value won't be stored on the record. Input was{' '}
                <span className="text-foreground/80">"{String(field.inputValue ?? '')}"</span>.
            </div>
        </div>
    )
}
