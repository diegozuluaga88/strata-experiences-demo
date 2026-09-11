// ST-1169 · Fase 1.B (integrado) · Diego 2026-09-09 · Intake button/dropzone
// COMPACTO para vivir dentro de la toolbar del Comparisons (al lado del
// search + view toggle). Reemplaza al banner separado que competía visualmente
// con la lista.
//
// Flow B del CEO Matt Danyliw · cuando Strata NO está conectada al business
// system, el usuario dropea el PO PDF + ACK PDF y Strata compara best-effort
// con OCR (Fase 3 wire OCR sim + confidence badges).
//
// ST-1169 · Diego 2026-09-10 · UX refactor · el button ya no abre el file
// picker nativo directo — abre un modal con dropzone GRANDE que soporta
// (1) drag-and-drop de archivos y (2) click para browse. Motivación: el
// button era muy chico para ser un target de drop y el click directo al
// picker nativo bloqueaba la vía DnD para usuarios que la prefieren.

import { Fragment, useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import { UploadCloud, X, FileText } from 'lucide-react'

export default function AckVsPoIntakeBar() {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return
        const fileNames = Array.from(files).map(f => f.name)
        window.dispatchEvent(new CustomEvent('ack-vs-po:pdfs-dropped', {
            detail: { fileCount: files.length, fileNames },
        }))
        setShowUploadModal(false)
        setIsDragOver(false)
    }, [])

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files)
        if (inputRef.current) inputRef.current.value = ''
    }

    const closeModal = () => {
        setShowUploadModal(false)
        setIsDragOver(false)
    }

    return (
        <>
            {/* Trigger · brand primary CTA · LAW 3 · bg-primary (lime)
                + text-primary-foreground (dark) · hover primary/90 (LAW 7). */}
            <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                title="Upload PO + ACK PDFs (drag-and-drop or browse)"
                className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Upload PDFs
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={onFilePicked}
                aria-label="Upload PO and ACK PDFs"
            />

            {/* Upload modal · headless-ui Dialog · scrim + dropzone.
                Pattern espejado del ComparisonReviewModal (mismo shell)
                para consistencia visual (border, radius, shadow, motion). */}
            <Transition show={showUploadModal} as={Fragment}>
                <Dialog onClose={closeModal} className="relative z-[200]">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" />
                    </TransitionChild>

                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-[95vw] max-w-[720px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
                                {/* Header · title inline con la meta rule (PDF only ·
                                    up to 2 files) para que la línea de metadata no
                                    quede huérfana adentro del dropzone. */}
                                <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <DialogTitle className="text-base font-bold text-foreground">Upload PDFs for comparison</DialogTitle>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                            <span>Drop a Purchase Order and its Acknowledgement · Strata compares best-effort with OCR</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        aria-label="Close"
                                        className="p-1.5 -m-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Dropzone · horizontal layout aprovecha el ancho ·
                                    icon-halo izquierda + text block derecha alineados
                                    en baseline compartida con el header. */}
                                <div className="px-6 py-6">
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                inputRef.current?.click()
                                            }
                                        }}
                                        onDrop={onDrop}
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        aria-label="Drop PDFs here or click to browse"
                                        className={`w-full flex items-center justify-center gap-6 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10 px-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                                            isDragOver
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60'
                                        }`}
                                    >
                                        <div className="h-16 w-16 shrink-0 rounded-full bg-brand-300/30 dark:bg-brand-500/20 flex items-center justify-center">
                                            <UploadCloud className="h-8 w-8 text-foreground" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-lg font-bold text-foreground leading-tight">
                                                {isDragOver ? 'Release to upload' : 'Drop PDFs here'}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                or <span className="font-semibold text-foreground underline underline-offset-2">click to browse</span>
                                            </div>
                                            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                <FileText className="h-3 w-3" />
                                                PDF only · up to 2 files
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer · cancel only · action taken on drop/select */}
                                <div className="border-t border-border px-6 py-3 bg-muted/20 flex items-center justify-end gap-2">
                                    <button
                                        onClick={closeModal}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}
