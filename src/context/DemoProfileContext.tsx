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
    // F78.b · Diego 2026-08-18 · Boot into Expert Hub (production experience)
    // por default en cada page load · antes era 'inbound-outbound'. Runtime
    // profile switches stay in memory only · no localStorage persistence · el
    // live demo siempre abre en la experiencia publicada principal.
    const [activeProfileId, setActiveProfileId] = useState<DemoProfileId>('expert-hub');

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
