// TT.53 · Diego 2026-09-08 · Floating experience switcher
//
// Cuando la experiencia activa monta su propia Navbar de producción (Expert
// Hub · Quote Converter) el host oculta su Navbar para NO duplicar chrome.
// Este componente rescata el acceso al selector de experiencias con una
// píldora flotante mini top-right · fuera del área de trabajo prod · alta
// z-index para quedar por encima del navbar prod (que suele estar z-50 rounded).
//
// Diseño: pequeño · íconografía neutral · popover reuse del listado de
// `useDemoProfile()`. No repite metadata rica del ExperienceSwitcher —
// es un escape hatch, no la home del catálogo.

import { Fragment } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ArrowsRightLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useDemoProfile } from '../../context/useDemoProfile'

export default function FloatingExperienceSwitcher() {
    const { activeProfile, profiles, switchProfile } = useDemoProfile()

    return (
        <div className="fixed top-2 right-2 z-[80]">
            <Popover className="relative">
                <PopoverButton
                    title="Switch experience"
                    className="inline-flex items-center gap-1.5 rounded-full bg-card/85 backdrop-blur-md border border-border shadow-sm hover:shadow-md text-xs font-semibold text-foreground px-2.5 py-1.5 hover:bg-card transition-shadow outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-muted-foreground" />
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
                    <PopoverPanel className="absolute right-0 top-full mt-2 w-72 py-2 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl z-[100] max-h-[70vh] flex flex-col">
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
