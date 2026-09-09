interface PublishingOverlayProps {
    label?: string
}

export default function PublishingOverlay({ label = 'Creating record…' }: PublishingOverlayProps) {
    return (
        <div className="absolute inset-0 bg-card/70 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <div className="size-10 rounded-full border-[3px] border-border" />
                    <div className="absolute inset-0 size-10 rounded-full border-[3px] border-foreground border-t-transparent animate-spin" />
                </div>
                <div className="text-[12.5px] text-muted-foreground font-medium">{label}</div>
            </div>
        </div>
    )
}
