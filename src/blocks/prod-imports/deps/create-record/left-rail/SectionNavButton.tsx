interface SectionNavButtonProps {
    active: boolean
    onClick: () => void
    title: string
    sub: string
    warn?: number
}

export default function SectionNavButton({ active, onClick, title, sub, warn = 0 }: SectionNavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl px-3 py-2.5 mb-1 transition flex items-center gap-3 ${
                active
                    ? 'bg-foreground text-background'
                    : 'hover:bg-card text-foreground/80'
            }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate">{title}</span>
                </div>
                <div className={`text-[11px] mt-0.5 ${active ? 'text-background/60' : 'text-muted-foreground'}`}>
                    {sub}
                </div>
            </div>
            {warn > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full text-[10.5px] font-semibold size-5 shrink-0 ${
                    active ? 'bg-red-500 text-white' : 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                }`}>
                    {warn}
                </span>
            )}
        </button>
    )
}
