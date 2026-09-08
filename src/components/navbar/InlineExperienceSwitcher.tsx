// TT.55 · Diego 2026-09-08 · Inline experience switcher
//
// Sustituye al FloatingExperienceSwitcher · se pinta INSIDE del navbar prod
// del Expert Hub (Wrapper le pasa este componente via `leftSlot` prop). Ver
// deps/Navbar.tsx@TT.55 para el hook.
//
// Estilo mimics el TENANT selector de al lado: small uppercase label +
// big bold current name + chevron. Popover abre downwards con el listado
// de profiles disponible via `useDemoProfile()`.

import { Fragment } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react'
import { useDemoProfile } from '../../context/useDemoProfile'

export default function InlineExperienceSwitcher() {
    const { activeProfile, profiles, switchProfile } = useDemoProfile()

    return (
        <div className="hidden sm:flex items-center gap-1 px-2">
            <Popover className="relative">
                <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">EXPERIENCE</div>
                    <PopoverButton className="flex items-center gap-1.5 text-sm font-bold text-foreground leading-tight hover:text-primary transition-colors outline-none">
                        <span className="flex items-center gap-1.5">
                            <span aria-hidden="true">{activeProfile.icon}</span>
                            <span className="truncate max-w-[140px]">{activeProfile.title ?? activeProfile.name}</span>
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform ui-open:rotate-180" />
                    </PopoverButton>
                </div>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                >
                    <PopoverPanel className="absolute left-0 top-full mt-2 w-72 py-2 rounded-xl bg-card border border-border shadow-xl z-[60] max-h-[70vh] flex flex-col">
                        <div className="px-3 py-2 border-b border-border mb-1 shrink-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Switch experience</p>
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
                                        <Check className="w-4 h-4 text-primary shrink-0" />
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
