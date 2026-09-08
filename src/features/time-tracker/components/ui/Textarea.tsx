// TT.46 · Diego 2026-09-08 · Shared Textarea wrapper · matches DS canonical
// (Strata Design System/strata-ds/src/components/forms/textarea.tsx).

import { forwardRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

const BASE = 'w-full rounded-lg border border-input bg-input-background/30 shadow-sm ' +
    'px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none ' +
    'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 transition-colors'

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ className = '', rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={`${BASE} ${className}`} {...rest} />
))
Textarea.displayName = 'Textarea'

export default Textarea
