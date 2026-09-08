// TT.46 · Diego 2026-09-08 · Shared Checkbox wrapper · matches DS canonical.
// Native input hidden (sr-only) para a11y + visual custom box con Check icon.
// Pattern del DS checkbox.tsx (data-[state=checked]:bg-brand-500 → aquí uso
// bg-success cuando checked, matching el tone semantic actual del app).

import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    label?: string
    /** Optional description shown under the label. */
    description?: string
    /** Visual size · 'sm' = 16px, 'md' = 20px (default). */
    size?: 'sm' | 'md'
}

const Checkbox = forwardRef<HTMLInputElement, Props>(({
    className = '', label, description, size = 'md', checked, disabled, ...rest
}, ref) => {
    const box = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
    return (
        <label className={`inline-flex items-start gap-2 group ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}>
            <span
                className={`${box} rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    checked
                        ? 'bg-success border-success'
                        : 'bg-input-background/30 border-input group-hover:border-primary'
                }`}
            >
                {checked && <Check className={`${icon} text-white`} strokeWidth={3} />}
            </span>
            {(label || description) && (
                <span className="flex-1 min-w-0">
                    {label && <span className="text-sm font-medium text-foreground">{label}</span>}
                    {description && <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>}
                </span>
            )}
            <input
                ref={ref}
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                {...rest}
            />
        </label>
    )
})
Checkbox.displayName = 'Checkbox'

export default Checkbox
