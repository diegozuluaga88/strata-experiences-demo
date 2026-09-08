import { createContext, useState, type ReactNode } from 'react';
import { DEMO_PROFILES, type DemoProfile, type DemoProfileId } from '../config/demoProfiles';

export interface DemoProfileContextType {
    activeProfile: DemoProfile;
    profiles: DemoProfile[];
    switchProfile: (id: DemoProfileId) => void;
}

// Exported so the hook (in useDemoProfile.ts) can subscribe. Splitting the
// hook into its own module keeps this file as a pure component file, which
// is what Vite's Fast Refresh requires — otherwise every save here triggers
// a full page reload and resets demo state mid-session.
export const DemoProfileContext = createContext<DemoProfileContextType | undefined>(undefined);

export function DemoProfileProvider({ children }: { children: ReactNode }) {
    // TT.49.1 · Diego 2026-09-08 · flipped default to 'time-tracker' (foco
    // actual de review con stakeholders · parity con Fase 1 en demo-2026-strata
    // que también arranca en time-tracker · TT.48.1). Antes era 'expert-hub'
    // (F78.b) · plan pendiente: refinar Expert Hub + Quote Converter (Standard
    // tier · MVP + lift páginas faltantes) antes de restituir el default a
    // 'expert-hub'. Runtime switches siguen sin persistencia · el live demo
    // vuelve a la default en cada page load.
    const [activeProfileId, setActiveProfileId] = useState<DemoProfileId>('time-tracker');

    const activeProfile = DEMO_PROFILES.find(p => p.id === activeProfileId) || DEMO_PROFILES[0];

    const switchProfile = (id: DemoProfileId) => {
        setActiveProfileId(id);
    };

    return (
        <DemoProfileContext.Provider value={{ activeProfile, profiles: DEMO_PROFILES, switchProfile }}>
            {children}
        </DemoProfileContext.Provider>
    );
}
