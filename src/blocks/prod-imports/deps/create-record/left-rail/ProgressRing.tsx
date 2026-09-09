interface ProgressRingProps {
    pct: number
}

export default function ProgressRing({ pct }: ProgressRingProps) {
    const r = 30
    const c = 2 * Math.PI * r
    const o = c - (Math.max(0, Math.min(100, pct)) / 100) * c

    return (
        <div title={`${Math.round(pct)}% of fields ready to publish`} className="relative w-[72px] h-[72px]">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                <circle cx="36" cy="36" r={r} stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/60" />
                <circle
                    cx="36" cy="36" r={r}
                    stroke="currentColor" strokeWidth="8" fill="none"
                    strokeDasharray={c} strokeDashoffset={o}
                    strokeLinecap="round"
                    className="text-foreground transition-[stroke-dashoffset] duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[15px] font-semibold text-foreground leading-none">{Math.round(pct)}%</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 font-medium tracking-wider uppercase">Ready</span>
            </div>
        </div>
    )
}
