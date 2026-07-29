// F46.a (Diego 2026-07-29) · enriched preview page for the PO vs ACK Match
// widget. Adds a "How the reconciliation works" card with 3-step flow above
// the widget, plus a "Status semantics" card below explaining what Match /
// Partial / Mismatch mean. Pattern-consistent with ConfidenceScoreBlock /
// ApprovalChainBlock (context wrappers around a widget), just richer visual
// because the reconciliation flow deserves educational framing. Historical
// note explains the "three-way → PO vs ACK" post-Neocon 2026-06-05 rename.
// F46.a.1 · wired onResolve para el "Notify dealer of exceptions" button
// (antes era no-op).
// F46.a.2 · reemplazado el banner custom por Callout primitive DS.
// F46.a.3 (Diego 2026-07-29) · click "Notify" abre un MODAL con per-line
// decisions (Accept / Reject / Request Info) · el user decide cada exception
// individualmente · submit dispara un TOAST fixed-positioned (no inline)
// para el confirmation post-submit. Pattern consistente con la
// DiscrepancyList canonical del F43 (per-row decisions).
import { Fragment, useMemo, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Callout } from 'strata-design-system';
import ThreeWayMatchView, { type MatchLine } from '../components/widgets/ThreeWayMatchView';

const MOCK_LINES: MatchLine[] = [
  { lineItem: 'Herman Miller Aeron · Size B',      sku: 'HM-AER-B-BLK',  poValue: '$1,395.00', ackValue: '$1,395.00', invoiceValue: '$1,395.00', status: 'match' },
  { lineItem: 'Steelcase Series 1 · Task Chair',   sku: 'SC-S1-STD',     poValue: '$489.00',   ackValue: '$489.00',   invoiceValue: '$514.00',   status: 'mismatch', delta: '+$25.00 unit price' },
  { lineItem: 'Knoll Antenna Workspaces · 6-pack', sku: 'KN-AW6-WLNT',   poValue: '$8,240.00', ackValue: '$8,240.00', invoiceValue: '$4,120.00', status: 'partial',  delta: 'Received 3 of 6 units' },
  { lineItem: 'Humanscale Float · Standing Desk',  sku: 'HS-FLT-72',     poValue: '$2,180.00', ackValue: '$2,180.00', invoiceValue: '$2,180.00', status: 'match' },
];

type Decision = 'accept' | 'reject' | 'request-info';

const DECISION_LABEL: Record<Decision, string> = {
  'accept': 'Accept',
  'reject': 'Reject',
  'request-info': 'Request info',
};

export default function ThreeWayMatchBlock() {
  const exceptions = useMemo(() => MOCK_LINES.filter(l => l.status !== 'match'), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [toastVisible, setToastVisible] = useState(false);

  const openModal = () => {
    setDecisions({});
    setModalOpen(true);
  };

  const setDecision = (sku: string, decision: Decision) => {
    setDecisions(prev => ({ ...prev, [sku]: decision }));
  };

  const decidedCount = Object.keys(decisions).length;
  const allDecided = decidedCount === exceptions.length && exceptions.length > 0;

  const submitDecisions = () => {
    setModalOpen(false);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ─── How the reconciliation works ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              How the reconciliation works
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              When a dealer sends a Purchase Order (PO), the manufacturer
              responds with an Acknowledgement (ACK) confirming line items,
              prices, and delivery. Strata AI reconciles the two documents
              line-by-line and flags any exception before it reaches the
              receiving dock.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-2 py-1 rounded-md shrink-0">
            Manufacturer side
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-info/10 text-info flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Dealer</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Sends Purchase Order</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Line items, quantities, unit prices, delivery dates.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center text-xs font-bold">2</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Manufacturer</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Sends Acknowledgement</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Confirms what will actually ship · flags substitutions, partial fills, price adjustments.</p>
          </div>
          <div className="rounded-xl border border-ai/30 bg-ai/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-ai/10 text-ai flex items-center justify-center text-xs font-bold">3</div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ai">Strata AI</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Reconciles line-by-line</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Detects match, partial, or mismatch per line · surfaces exceptions before they reach the dock.</p>
          </div>
        </div>

        <div className="mt-6 text-[11px] text-muted-foreground border-t border-border pt-4 leading-relaxed">
          <span className="font-semibold text-foreground">Why "three-way"?</span>
          {' '}Originally the flow reconciled PO ↔ ACK ↔ Receipt (invoice at dock).
          Post-Neocon 2026 review, the manufacturer stops at the ACK stage · they
          <span className="font-semibold text-foreground"> detect</span>, the dealer
          <span className="font-semibold text-foreground"> resolves</span>. The Receipt/Invoice
          column moved to a downstream dealer-side widget.
        </div>
      </div>

      {/* ─── Widget ─────────────────────────────────────────────────────── */}
      <ThreeWayMatchView orderId="PO-2044-71" lines={MOCK_LINES} onResolve={openModal} />

      {/* ─── Status semantics ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Status semantics</h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Each line gets one of three statuses after reconciliation. The footer
          aggregates the counts and surfaces the dealer-facing CTA when
          exceptions exist.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="text-sm font-bold text-success">Match</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PO value = ACK value across all fields. No action required ·
              the ACK ships as ordered.
            </p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning" />
              <span className="text-sm font-bold text-warning">Partial</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quantity or delivery differs (e.g. 3 of 6 units received).
              Dealer decides · accept partial, expedite, or backorder.
            </p>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <XCircleIcon className="w-5 h-5 text-destructive" />
              <span className="text-sm font-bold text-destructive">Mismatch</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Price or SKU discrepancy (e.g. +$25.00 unit price).
              Requires dealer notification and manual resolution.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Per-line decision Modal ──────────────────────────────────── */}
      <Transition show={modalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">Resolve exceptions · PO-2044-71</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Decide how to handle each mismatch before notifying the dealer.
                      </p>
                    </div>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="shrink-0 h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Per-line decisions */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {exceptions.map(line => {
                      const isMismatch = line.status === 'mismatch';
                      const decision = decisions[line.sku];
                      return (
                        <div
                          key={line.sku}
                          className={`rounded-xl border p-4 space-y-3 ${
                            isMismatch
                              ? 'border-destructive/30 bg-destructive/5'
                              : 'border-warning/30 bg-warning/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{line.lineItem}</p>
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{line.sku}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${
                              isMismatch ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                            }`}>
                              {isMismatch ? <XCircleIcon className="h-3 w-3" /> : <ExclamationTriangleIcon className="h-3 w-3" />}
                              {line.delta}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <p className="text-muted-foreground uppercase font-bold tracking-wider">PO</p>
                              <p className="font-mono text-foreground mt-0.5">{line.poValue}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground uppercase font-bold tracking-wider">ACK</p>
                              <p className="font-mono text-foreground mt-0.5">{line.ackValue}</p>
                            </div>
                          </div>

                          {/* Decision buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Decision:</span>
                            {(['accept', 'reject', 'request-info'] as Decision[]).map(d => {
                              const active = decision === d;
                              const activeClass =
                                d === 'accept' ? 'bg-success text-white'
                                : d === 'reject' ? 'bg-destructive text-white'
                                : 'bg-info text-white';
                              return (
                                <button
                                  key={d}
                                  onClick={() => setDecision(line.sku, d)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    active
                                      ? activeClass
                                      : 'bg-transparent text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground'
                                  }`}
                                >
                                  {DECISION_LABEL[d]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {decidedCount} of {exceptions.length} decided · dealer will receive notification with your resolutions.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalOpen(false)}
                        className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitDecisions}
                        disabled={!allDecided}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <BellIcon className="h-3.5 w-3.5" />
                        Notify dealer ({decidedCount})
                      </button>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ─── Toast · fixed-positioned post-submit confirmation ─────────── */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-[60] w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Callout
            tone="success"
            variant="strong"
            icon={<BellIcon className="w-4 h-4" />}
            eyebrow="Dealer notified"
            title={`${decidedCount} resolution${decidedCount !== 1 ? 's' : ''} routed to Apex Furniture procurement`}
            body="NotificationAgent · email + in-app · 24hr SLA for dealer response."
            actions={
              <button
                onClick={() => setToastVisible(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            }
            className="shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
