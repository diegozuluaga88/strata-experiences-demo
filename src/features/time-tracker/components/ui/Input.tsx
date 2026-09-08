// TT.46 · Diego 2026-09-08 · Shared Input wrapper · matches DS Strata canonical
// (Strata Design System/strata-ds/src/components/forms/input.tsx pattern).
//
// Pattern usa bg-input-background/30 (con 30% alpha) para diferenciar
// visualmente de disabled state · antes usaba bg-background (page bg) que
// daba sensación de campo bloqueado.

import { forwardRef, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

const BASE = 'w-full rounded-lg border border-input bg-input-background/30 shadow-sm ' +
    'px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ' +
    'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 transition-colors'

const Input = forwardRef<HTMLInputElement, Props>(({ className = '', type = 'text', ...rest }, ref) => (
    <input ref={ref} type={type} className={`${BASE} ${className}`} {...rest} />
))
Input.displayName = 'Input'

export default Input
