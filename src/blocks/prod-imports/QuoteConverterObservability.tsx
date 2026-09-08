// SOURCE: quote-converter/src/Observability.tsx · lift para strata-experiences-demo S4.a
import { BarChart3 } from 'lucide-react'
import Navbar from './deps/quote-converter/Navbar'
import Breadcrumbs from './deps/Breadcrumbs'

interface ObservabilityProps {
    onLogout: () => void
    onNavigate: (page: string) => void
}

export default function Observability({ onLogout, onNavigate }: ObservabilityProps) {
    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-10">
            {/* Breadcrumb hoisted above navbar — matches prod top-left position */}
            <div className="fixed top-2 left-6 z-50 text-xs opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
                <Breadcrumbs items={[
                    { label: 'SIF Generator', onClick: () => onNavigate('ocr') },
                    { label: 'Observability', active: true },
                ]} />
            </div>

            {/* Status badge — top right, matches prod "Error" pill */}
            <div className="fixed top-2 right-6 z-50">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Error
                </span>
            </div>

            <Navbar onLogout={onLogout} activeTab="Observability" onNavigateToWorkspace={() => onNavigate('ocr')} onNavigate={onNavigate} />

            <div className="pt-24 px-4 max-w-screen-2xl mx-auto">
                <div className="flex flex-col items-center justify-center text-center min-h-[60vh]">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                        <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">No dashboards available</h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        You don't have any dashboards assigned to your account. Contact your
                        account manager to get access.
                    </p>
                </div>
            </div>
        </div>
    )
}
