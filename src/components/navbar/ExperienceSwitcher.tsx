import { Fragment } from 'react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useDemoProfile } from '../../context/useDemoProfile';
import { SHARED_BLOCKS } from '../../config/sharedBlocks';
import StatusBadge from '../shared/StatusBadge';
import type { DemoProfile } from '../../config/demoProfiles';

interface ExperienceSwitcherProps {
  appName?: string;
  companyName?: string;
  activeBlockId?: string | null;
  showExperienceIcon?: boolean;
}

/**
 * ExperienceSwitcher · popover for experience switching.
 *
 * F78.f · Diego 2026-08-18 · segmented-tabs pattern for production experiences:
 *   · 2 sticky tabs at top (Expert Hub · Quote Converter) · ALWAYS visible ·
 *     no scroll required to find the other one
 *   · Click a tab BODY  → swap `previewTab` (dropdown stays open · user
 *     explora features de esa experience sin salir)
 *   · Click the "→" arrow → switchProfile + close (navigate a la prod app)
 *   · Below tabs · single "Features included in {tab}" section that swaps
 *     between Expert Hub / Quote Converter children based on previewTab
 *   · Elimina la redundancia del head row (Expert Hub / QC) DENTRO del
 *     features list · la tab misma ES el head
 *   · Standalone demos section unchanged
 *
 * Row badges:
 *   · Production head (tabs) → success tone "Production"
 *   · Related demo (children) → info tone "{Parent} · Demo"
 *   · Standalone → neutral tone "Demo"
 */
export default function ExperienceSwitcher({
  appName,
  companyName,
  activeBlockId,
  showExperienceIcon = true,
}: ExperienceSwitcherProps) {
  const { activeProfile, profiles, switchProfile } = useDemoProfile();

  const activeBlock = activeBlockId
    ? SHARED_BLOCKS.find(b => b.id === activeBlockId)
    : undefined;

  const displayIcon = activeBlock?.icon ?? activeProfile.icon;
  const displayLabel = activeBlock
    ? activeBlock.kind === 'widget' ? 'Widget · Preview' : 'Shared Block · Preview'
    : (appName || activeProfile.experienceLabel || 'Dealer Experience');
  const displayCompany = activeBlock
    ? activeBlock.title
    : (companyName || activeProfile.companyName);

  return (
    <Popover className="relative hidden lg:block">
      <PopoverButton className="flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer outline-none group">
        {showExperienceIcon && (
          <span
            className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-base"
            aria-hidden="true"
          >
            {displayIcon}
          </span>
        )}
        <span className="flex flex-col items-start">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
            {displayLabel}
          </span>
          <span className="text-sm font-bold text-foreground leading-tight flex items-center gap-1 mt-0.5">
            {displayCompany}
          </span>
        </span>
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
        <PopoverPanel className="absolute left-0 top-full mt-2 w-[26rem] py-0 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl z-[200] max-h-[75vh] flex flex-col overflow-hidden">
          {(() => {
          const parentMap: Record<string, string> = {
            'expert-hub': 'Expert Hub',
            'quote-converter': 'Quote Converter',
          };
          const expertHubHead = profiles.find(p => p.id === 'expert-hub');
          const quoteConverterHead = profiles.find(p => p.id === 'quote-converter');
          // F78.h · Diego 2026-08-18 · consolida non-production en una sola
          // lista "Standalone demos" · antes había una sección separada
          // "Features included in {tab}" que confundía. El chip de cada row
          // sigue mostrando ownership ({Parent} · Client demo) cuando aplica.
          const expertHubChildCount = profiles.filter(p => p.parentExperience === 'expert-hub').length;
          const quoteConverterChildCount = profiles.filter(p => p.parentExperience === 'quote-converter').length;
          const standalone = profiles
            .filter(p => p.id !== 'expert-hub' && p.id !== 'quote-converter')
            .sort((a, b) => (b.lastUpdated ?? '').localeCompare(a.lastUpdated ?? ''));

          // Chip · signals demo origin (client demo vs in-progress) + parent
          // ownership · sin nombrar el cliente puntual (per user 2026-08-18).
          const originLabel = (origin?: DemoProfile['demoOrigin']) =>
            origin === 'in-progress' ? 'In progress' : 'Client demo';
          const originTone = (origin?: DemoProfile['demoOrigin']) =>
            origin === 'in-progress' ? 'warning' : 'info';

          const rowBadge = (profile: DemoProfile) => {
            if (profile.maturity === 'production') {
              return <StatusBadge label="Production" tone="success" size="xs" />;
            }
            const label = profile.parentExperience && parentMap[profile.parentExperience]
              ? `${parentMap[profile.parentExperience]} · ${originLabel(profile.demoOrigin)}`
              : originLabel(profile.demoOrigin);
            return <StatusBadge label={label} tone={originTone(profile.demoOrigin)} size="xs" />;
          };

          const renderProfile = (profile: DemoProfile, opts: { indent?: boolean } = {}) => (
            <PopoverButton
              as="button"
              key={profile.id}
              onClick={() => {
                const url = new URL(window.location.href);
                if (url.searchParams.has('block')) {
                  url.searchParams.delete('block');
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new CustomEvent('block:change'));
                }
                switchProfile(profile.id);
              }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${
                opts.indent ? 'pl-6' : ''
              }`}
            >
              <span className="text-lg shrink-0 leading-tight pt-0.5">{profile.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {profile.title ?? profile.name}
                  </p>
                  {rowBadge(profile)}
                </div>
                {profile.subtitle && (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {profile.subtitle}
                  </p>
                )}
                {profile.sourceLabel && (
                  <p className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5 italic">
                    {profile.sourceLabel}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {!activeBlockId && activeProfile.id === profile.id && (
                  <CheckIcon className="w-4 h-4 text-primary" />
                )}
                {profile.lastUpdated && (
                  <span
                    className="text-[9px] font-mono text-muted-foreground tabular-nums"
                    title={`Last updated: ${profile.lastUpdated}`}
                  >
                    {profile.lastUpdated.slice(5)}
                  </span>
                )}
              </div>
            </PopoverButton>
          );

          // Production tab · single PopoverButton · click ANYWHERE = navigate
          // + close. Pill top-right es decorativo (`pointer-events-none`).
          const productionTab = (opts: {
            profile: DemoProfile;
            childCount: number;
          }) => {
            const isActive = activeProfile.id === opts.profile.id;
            return (
              <PopoverButton
                as="button"
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  if (url.searchParams.has('block')) {
                    url.searchParams.delete('block');
                    window.history.pushState({}, '', url.toString());
                    window.dispatchEvent(new CustomEvent('block:change'));
                  }
                  switchProfile(opts.profile.id);
                }}
                className={`
                  relative rounded-lg border transition-all text-left w-full
                  flex items-start gap-2 p-2.5 group
                  ${isActive
                    ? 'border-primary/70 bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/60 hover:bg-primary/5'}
                `}
                aria-label={`Open ${opts.profile.title}`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 text-foreground flex items-center justify-center text-base"
                  aria-hidden="true"
                >
                  {opts.profile.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-success uppercase tracking-wider leading-none">
                    Published
                  </p>
                  <p className="text-xs font-bold text-foreground leading-tight mt-1 truncate">
                    {opts.profile.title}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <StatusBadge label="Production" tone="success" size="xs" />
                    <span
                      className="text-[9px] font-mono text-muted-foreground tabular-nums"
                      title={`${opts.childCount} related demos in the Standalone list below`}
                    >
                      {opts.childCount} related
                    </span>
                  </div>
                </div>
                {/* Decorative chip · top-right · signals active/openable state */}
                <span
                  className={`
                    absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md
                    text-[9px] font-bold uppercase tracking-wider px-1.5 py-1
                    pointer-events-none transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground'}
                  `}
                  aria-hidden="true"
                >
                  {isActive ? 'Active' : 'Open'}
                  <ArrowRightIcon className="w-2.5 h-2.5" />
                </span>
              </PopoverButton>
            );
          };

          const staticHeader = (label: string) => (
            <div className="px-3 py-2 border-y border-border shrink-0 sticky top-0 bg-card/95 backdrop-blur-xl z-10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
            </div>
          );

          return (
            <>
              {/* ─── STICKY TOP · 2 production tabs · always visible ─── */}
              {(expertHubHead || quoteConverterHead) && (
                <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-xl px-2 pt-2 pb-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                    Published products
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {expertHubHead && productionTab({
                      profile: expertHubHead,
                      childCount: expertHubChildCount,
                    })}
                    {quoteConverterHead && productionTab({
                      profile: quoteConverterHead,
                      childCount: quoteConverterChildCount,
                    })}
                  </div>
                </div>
              )}

              {/* ─── SCROLLABLE BODY ─── */}
              <div className="overflow-y-auto flex-1 min-h-0">
                {/* Standalone demos · TODO non-production consolidado ·
                    incluye Expert Hub / Quote Converter related · cada row
                    mantiene su chip mostrando ownership. */}
                {standalone.length > 0 && (
                  <div>
                    {staticHeader('Standalone demos')}
                    {standalone.map(p => renderProfile(p))}
                  </div>
                )}

                {/* Shared blocks · chip "Building block · In progress" */}
                <div className="mt-2">
                  {staticHeader('Shared Building Blocks')}
                  {SHARED_BLOCKS.filter(b => b.kind === 'shared-block').map(block => (
                    <PopoverButton
                      as="button"
                      key={block.id}
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('block', block.id);
                        window.history.pushState({}, '', url.toString());
                        window.dispatchEvent(new CustomEvent('block:change'));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <span className="text-base shrink-0">{block.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm text-foreground truncate">{block.title}</p>
                          <StatusBadge label="Building block · In progress" tone="warning" size="xs" />
                        </div>
                      </div>
                      {activeBlockId === block.id && (
                        <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </PopoverButton>
                  ))}
                </div>

                {/* Widgets · chip "Widget · In progress" */}
                <div className="mt-2">
                  {staticHeader('Widgets')}
                  {SHARED_BLOCKS.filter(b => b.kind === 'widget').map(block => (
                    <PopoverButton
                      as="button"
                      key={block.id}
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('block', block.id);
                        window.history.pushState({}, '', url.toString());
                        window.dispatchEvent(new CustomEvent('block:change'));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <span className="text-base shrink-0">{block.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm text-foreground truncate">{block.title}</p>
                          <StatusBadge label="Widget · In progress" tone="warning" size="xs" />
                        </div>
                      </div>
                      {activeBlockId === block.id && (
                        <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </PopoverButton>
                  ))}
                </div>
              </div>
            </>
          );
          })()}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
