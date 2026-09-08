// TT.53 · Diego 2026-09-08 · Floating experience switcher
//
// Cuando la experiencia activa monta su propia Navbar de producción (Expert
// Hub · Quote Converter) el host oculta su Navbar para NO duplicar chrome.
// Este componente rescata el acceso al selector.
//
// TT.54 · Diego 2026-09-08 · reposicionado a top-6 left-4 (mismo eje vertical
// que la navbar prod rounded-full top-6) + chrome matching (bg-card/80
// backdrop-blur-xl · border · shadow-lg) para que lea como "chip integrado"
// al costado izquierdo de la navbar prod · no como pill flotante separado.
// Diseño: compacto · íconografía neutral · popover reuse del listado de
// `useDemoProfile()`. No repite metadata rica del ExperienceSwitcher —
// es un escape hatch, no la home del catálogo.

import { Fragment } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ArrowsRightLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useDemoProfile } from '../../context/useDemoProfile'

export default function FloatingExperienceSwitcher() {
    const { activeProfile, profiles, switchProfile } = useDemoProfile()

    return (
        <div className="fixed top-6 left-4 z-[55]">
            <Popover className="relative">
                <PopoverButton
                    title="Switch experience"
                    className="inline-flex items-center gap-1.5 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border shadow-lg dark:shadow-glow-md text-xs font-semibold text-foreground px-3 hover:bg-card transition-colors outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <ArrowsRightLeftIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="hidden sm:inline">Experiences</span>
                </PopoverButton>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                >
                    <PopoverPanel className="absolute left-0 top-full mt-2 w-72 py-2 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl z-[100] max-h-[70vh] flex flex-col">
                        <div className="px-3 py-2 border-b border-border mb-1 shrink-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Switch experience</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Currently viewing <span className="font-semibold text-foreground">{activeProfile.title ?? activeProfile.name}</span></p>
                        </div>
                        <div className="overflow-y-auto flex-1 min-h-0">
                            {profiles.map(profile => (
                                <PopoverButton
                                    as="button"
                                    key={profile.id}
                                    onClick={() => switchProfile(profile.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${activeProfile.id === profile.id ? 'bg-muted/60' : ''}`}
                                >
                                    <span className="text-base shrink-0" aria-hidden="true">{profile.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{profile.title ?? profile.name}</p>
                                        {profile.subtitle && (
                                            <p className="text-[11px] text-muted-foreground truncate">{profile.subtitle}</p>
                                        )}
                                    </div>
                                    {activeProfile.id === profile.id && (
                                        <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                </PopoverButton>
                            ))}
                        </div>
                    </PopoverPanel>
                </Transition>
            </Popover>
        </div>
    )
}
