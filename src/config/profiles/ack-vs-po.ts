// ═══════════════════════════════════════════════════════════════════════════════
// ACK vs PO · profile stub · strata-experiences-demo · 2026-09-09
// ═══════════════════════════════════════════════════════════════════════════════
//
// ST-1169 · Diego 2026-09-09 · Feature-module profile · no guided tour
// (steps=[]) · lands directly on AckVsPoApp via `defaultApp: 'ack-vs-po'` +
// `hideChrome: true` in the DEMO_PROFILES registry entry.
//
// The intake dual-flow (Action Center notification for Flow A · file drop
// zone for Flow B) lives inside the feature module itself · this profile
// only registers the shell.
//
// Source: config-evolution/ack-vs-po-demo (clon de expert-hub@1f58b0e ·
// Comparisons view SOT). See src/features/ack-vs-po/ for the app.

import type { DemoStep } from '../demoProfiles';
import type { StepBehavior } from '../../components/demo/DemoStepBanner';

export const ACK_VS_PO_STEPS: DemoStep[] = [];
export const ACK_VS_PO_STEP_BEHAVIOR: Record<string, StepBehavior> = {};
export const ACK_VS_PO_STEP_MESSAGES: Record<string, string[]> = {};
export const ACK_VS_PO_SELF_INDICATED: string[] = [];
