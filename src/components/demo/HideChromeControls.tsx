import { ChevronRight, X } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { useDemoProfile } from '../../context/useDemoProfile';

/**
 * HideChromeControls · F78.k · Diego 2026-08-18
 *
 * Floating control bar que se muestra SOLO cuando `activeProfile.hideChrome`
 * es `true` (los "content-only" auto-play profiles · COI · Acme).
 *
 * Estos profiles esconden intencionalmente el DemoSidebar (steps list),
 * DemoStepBanner (bottom bar), DemoSpotlight (overlay) · el user ve solo
 * el contenido puro de la scene. El problema (Diego 2026-08-18) · los
 * primeros pasos son auto-play (choreographed timeouts) · el user no
 * tiene forma de avanzar manualmente si el flow se demora ni de salir
 * si quiere ver otra cosa · esto crea confusión.
 *
 * Este componente agrega 2 CTAs bottom-right:
 *  · "Skip →"  → llama `nextStep()` (avanza el step actual)
 *  · "Exit"    → llama `setIsDemoActive(false)` (sale del tour · muestra
 *    la app cruda · user puede usar el navbar para cambiar de profile)
 *
 * Se auto-oculta cuando el user ya está en el último step (no `next` posible).
 */
export default function HideChromeControls() {
    const { activeProfile } = useDemoProfile();
    const { isDemoActive, setIsDemoActive, nextStep, currentStepIndex, steps } = useDemo();

    // Solo mostrar en profiles con hideChrome + demo activo
    if (!activeProfile.hideChrome || !isDemoActive) return null;

    const isLastStep = currentStepIndex >= steps.length - 1;

    return (
        <div
            className="fixed bottom-6 right-6 z-[400] flex items-center gap-2"
            aria-label="Auto-play tour controls"
        >
            <button
                type="button"
                onClick={() => setIsDemoActive(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border shadow-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                title="Exit tour · returns to the raw app"
            >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Exit
            </button>
            {!isLastStep && (
                <button
                    type="button"
                    onClick={() => nextStep()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    title={`Skip to next step (${currentStepIndex + 2} / ${steps.length})`}
                >
                    Skip
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-[10px] font-mono tabular-nums opacity-80">
                        {currentStepIndex + 1}/{steps.length}
                    </span>
                </button>
            )}
        </div>
    );
}
