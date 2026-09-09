import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
    value: string | null | undefined  // ISO 'YYYY-MM-DD'
    onChange: (iso: string) => void
    placeholder?: string
    minDate?: string
    maxDate?: string
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n)
}

function toIso(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseIso(s: string | null | undefined): Date | null {
    if (!s) return null
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (!m) return null
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return Number.isNaN(d.getTime()) ? null : d
}

function formatDisplay(d: Date): string {
    return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

// Monday-first weekday (0=Mon ... 6=Sun)
function firstWeekdayMon(year: number, month: number): number {
    const jsDay = new Date(year, month, 1).getDay() // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1
}

function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

interface Cell {
    date: Date
    inMonth: boolean
}

function buildGrid(year: number, month: number): Cell[] {
    const cells: Cell[] = []
    const days = daysInMonth(year, month)
    const lead = firstWeekdayMon(year, month)
    const prevDays = daysInMonth(year, month - 1)

    for (let i = lead - 1; i >= 0; i--) {
        cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false })
    }
    for (let d = 1; d <= days; d++) {
        cells.push({ date: new Date(year, month, d), inMonth: true })
    }
    let trailing = 1
    while (cells.length < 42) {
        cells.push({ date: new Date(year, month + 1, trailing++), inMonth: false })
    }
    return cells
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', minDate, maxDate }: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedDate = parseIso(value)
    const initialView = selectedDate ?? new Date()
    const [viewYear, setViewYear] = useState(initialView.getFullYear())
    const [viewMonth, setViewMonth] = useState(initialView.getMonth())

    const minD = parseIso(minDate)
    const maxD = parseIso(maxDate)

    // Click-outside to close
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // ESC to close
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open])

    const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth])
    const today = new Date()

    const goPrev = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    const goNext = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const isDisabled = (d: Date): boolean => {
        if (minD && d < minD) return true
        if (maxD && d > maxD) return true
        return false
    }

    const pick = (d: Date) => {
        if (isDisabled(d)) return
        onChange(toIso(d))
        setOpen(false)
    }

    const goToday = () => {
        setViewYear(today.getFullYear())
        setViewMonth(today.getMonth())
        if (!isDisabled(today)) {
            onChange(toIso(today))
            setOpen(false)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px] text-left transition ${
                    selectedDate
                        ? 'border-border bg-card text-foreground hover:border-zinc-400 dark:hover:border-zinc-600'
                        : 'border-border bg-card text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
            >
                <span className="truncate">
                    {selectedDate ? formatDisplay(selectedDate) : placeholder}
                </span>
                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            </button>

            {open && (
                <div className="absolute z-30 mt-1.5 w-[280px] rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Month nav */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <button
                            type="button"
                            onClick={goPrev}
                            title="Previous month"
                            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <div className="text-[13px] font-medium text-foreground">
                            {MONTHS[viewMonth]} {viewYear}
                        </div>
                        <button
                            type="button"
                            onClick={goNext}
                            title="Next month"
                            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>

                    {/* Weekday header */}
                    <div className="grid grid-cols-7 px-2 pt-2 pb-1">
                        {WEEKDAYS.map((w, i) => (
                            <div key={i} className="text-center text-[10.5px] font-semibold text-muted-foreground/80 uppercase tracking-wider py-1">
                                {w}
                            </div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                        {grid.map((cell, i) => {
                            const isSelected = selectedDate ? sameDay(cell.date, selectedDate) : false
                            const isToday = sameDay(cell.date, today)
                            const disabled = isDisabled(cell.date)
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => pick(cell.date)}
                                    disabled={disabled}
                                    className={`size-9 inline-flex items-center justify-center rounded-md text-[12.5px] font-medium transition-colors relative ${
                                        isSelected
                                            ? 'bg-foreground text-background hover:opacity-90'
                                            : disabled
                                                ? 'text-muted-foreground/40 cursor-not-allowed'
                                                : cell.inMonth
                                                    ? 'text-foreground hover:bg-muted'
                                                    : 'text-muted-foreground/50 hover:bg-muted hover:text-foreground/80'
                                    }`}
                                >
                                    {cell.date.getDate()}
                                    {isToday && !isSelected && (
                                        <span className="absolute bottom-1 size-1 rounded-full bg-brand-500" />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                        <button
                            type="button"
                            onClick={goToday}
                            title="Jump to today and select it"
                            className="text-[12px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
                        >
                            Today
                        </button>
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={() => { onChange(''); setOpen(false) }}
                                title="Remove the selected date"
                                className="text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
