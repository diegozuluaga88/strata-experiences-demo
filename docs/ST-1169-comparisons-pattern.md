# ST-1169 · ACK vs PO · Comparisons Pattern

**Autor**: Diego Zuluaga
**Fecha**: 2026-09-10
**Ticket**: ST-1169
**Snapshot commits**:
- `strata-experiences-demo`: `55446e8` (post-Fase 4)
- `ack-vs-po-demo`: `455a5b7` (post-Fase 4)
- `expert-hub`: `1f58b0e` (baseline · no cambios en esta iteración)

---

## Contexto

El CEO Matt Danyliw pidió automatizar un proceso manual actual de **12 pasos entre 2 aplicaciones distintas** (Order Bahn + Officeworks CORE) para comparar Purchase Orders vs Acknowledgements. El pain point catastrófico: los usuarios de Officeworks aceptaban todas las líneas sin ver primero qué estaban aceptando, causando errores en downstream.

El ticket también pide alinear la pantalla al **patrón visual del hub principal** que tiene dos vistas coexistentes (tarjetas + tabla) — no elegir una, no inventar una tercera.

---

## Acceptance Criteria · cobertura

### AC1 · Behaviour documentado + divergences named

**Patrón oficial (SOT en Expert Hub)**
- Grid view (cards) + List view (table) coexisten · toggle en toolbar
- Filtros por status con contadores (Pending · Reviewed · Discrepancy · Completed)
- Search por vendor, PO number, ACK ID
- Regla "ACK sin PO oculto" (los ACKs huérfanos no se muestran)
- Avatar del reviewer asignado en cada card
- Colores de marca correctos (lime, no purple genérico de AI)

**Vocabulario de status · dual (backend enum → dealer-friendly label)**
| Backend enum | Label user-facing |
|---|---|
| `REQUIRES_REVIEW` | Necesita revisión |
| `EXACT_MATCH` | Coincide exacto |
| `VERIFIED_WITH_MINOR_CHANGES` | Verificado con ajustes menores |
| `CRITICAL_ISSUES` | Diferencias críticas |
| `PROCESSING_FAILED` | Falló procesamiento |
| `MANDATORY_REVIEW` | Revisión obligatoria |
| `SUGGESTED_REVIEW` | Revisión sugerida |
| `AUTO_APPLY_ELIGIBLE` | Auto-aplicable |

**Divergences named** (documentadas · resolvibles en follow-up)
1. **Duplicación con Transactions** · el modulo Transactions también muestra un grid con status similares. Consolidar en post-ST-1169.
2. **Grid + Table default view diverge** · algunos demos por historia (DE1.5, DE1.25) tienen default `list`; otros `grid`. La regla es respetar el default del hub principal (`grid`).
3. **Schema de ValidatedLineItem** · en producción no incluye List, Discount, Total, Required Ship, Ack Ship Date. Los valores se derivan del mock (unit_price × qty × discount %). Fase 3 wire real schema via SuiteQL/REST.

### AC2 · Single flow con y sin auxiliary doc (los 2 flows del CEO)

**Flow A · Strata conectada al business system**
- Trigger: notificación en Action Center
- Bell icon en navbar con red-dot (indicador de nueva notif)
- Click bell → popover flotante (NO scrim · es ventana flotante, no modal — [`feedback-notifications-action-center`](../../MEMORY.md))
- Notif card: "New ACK · PO-XXXX · Vendor" con CTA "Compare with PO"
- Click CTA → `AckVsPoProcessingModal` con staged reveal:
  - Connecting to Officeworks CORE (OAuth handshake)
  - Fetching PO header + footer (buyer · ship-to · totals)
  - Loading line items (SKU · qty · unit price)
  - Staging PO vs ACK for comparison (SKU alignment + fuzzy match)
- Al terminar → abre `ComparisonReviewModal` con datos pre-populated
- User resuelve discrepancias → confirma → toast success + card LIME ring

**Flow B · Strata NO conectada (fallback OCR)**
- Trigger: click "Upload PDFs" en toolbar del Comparisons view
- Abre `AckVsPoIntakeBar` modal (headless-ui Dialog):
  - Scrim 40% dark bg
  - Modal centrado 720×~307 con dropzone grande
  - Dropzone soporta **drag-and-drop** (native HTML5) AND **click-to-browse** (native file picker)
  - Cancel button en footer
- Drop o pick de PDFs → dispatcha `CustomEvent('ack-vs-po:pdfs-dropped', {fileCount, fileNames})`
- `AckVsPoProcessingModal` con staged reveal OCR:
  - Uploading PDFs to OCR engine (Tesseract + LLM fallback)
  - Extracting text + tables (page segmentation)
  - Parsing PO structured fields
  - Parsing ACK structured fields
  - Cross-matching fields by SKU (fuzzy match · 92% confidence average)
- Al terminar → abre MISMO `ComparisonReviewModal` con datos OCR-extracted
- Consistency total con Flow A · el user resuelve en el mismo modal independientemente del trigger

**Convergencia**: ambos flows terminan en el mismo `ComparisonReviewModal` — la mecánica de review es idéntica para el user, solo cambia el origen de datos (conectado vs OCR).

### AC3 · State mapping · before / in-progress / completed

Ciclo de vida canónico de una comparación:

| State | UI representation | Data flag |
|---|---|---|
| **before** (Pending) | Card con status "Pending" · Discrepancies "Not analyzed" · action `Compare` visible | `status: 'Pending'` + `reviewStatus: null` |
| **in progress** (Analyzing) | Card con status "Analyzing X/N líneas..." · spinner ambient · badge count grows | `status: 'Analyzing'` + `linesProcessed: N` |
| **review needed** | Card con badge "N dif · M critical" (yellow/red) · action `Compare` primary | `derived_status: 'REQUIRES_REVIEW'` |
| **in resolution** (modal open) | Modal open · rows con Accept ACK/Keep PO buttons pending · counter "X of 3 discrepancies resolved" (red) | `resolutions: Map<line, 'accept-ack'|'keep-po'>` |
| **all resolved** (ready to confirm) | Modal con pills Accepted ACK/Kept PO en todas las diff rows · Undo links · counter "3 of 3 resolved" (green) · Confirm decisions ready | `resolutions.size === diffCount` |
| **completed** (post-Confirm) | Card con status "Completed" · LIME highlight ring 5s · toast success "ACK-XXXX vs PO-YYYY accepted · pushed to Officeworks CORE" | `status: 'Completed'` + `commitEvent: dispatched` |

**Helper**: `canonicalStatus.ts` mapea backend enums → dealer-friendly labels (referenciado en `ExpertHubComparisons.tsx`).

### AC4 · Snapshot commit references

**Commits al momento del cierre de ST-1169**:
- `strata-experiences-demo@55446e8` · main branch · incluye Fase 2.D refactor (CORE-parity table) + col-highlight fix + upload-modal UX refactor
- `ack-vs-po-demo@455a5b7` · main branch · incluye col-highlight fix adaptado al schema viejo (Qty only)
- `expert-hub@1f58b0e` · main branch · SIN cambios en esta iteración (Diego decision 2026-09-10)

**Rama de trabajo**: cambios locales sin push · esperando approval verbal del user antes de deploy.

---

## Behavior details clave

### Discrepancy visualization · pattern CORE-parity

Referencia: 20+ screencaps de Officeworks CORE compare view (2026-09-09) — el compare real que los usuarios usan HOY.

**Row-level tint** (baseline hint global)
- `bg-red-50/30 dark:bg-red-500/5` en la fila entera cuando `!li.matched`
- Sutil · comunica "esta línea tiene una discrepancia"

**Cell-level tint** (per-column full-height highlight · CORE + Figma parity)
- `bg-red-100 dark:bg-red-500/20` en las celdas específicas de las columnas que divergen
- Se aplica tanto a la fila PO como a la fila ACK (full-height column highlight)
- Columnas cubiertas en `strata-experiences-demo` (Fase 2.D CORE-parity):
  - `qtyDiff` → PO Qty + ACK Qty
  - `costDiff` → List, Unit Cost (ambas filas)
  - `totalDiff` → Total Cost (ambas filas)
  - `shipDiff` → Required Ship + Ack Ship Date (ambas filas)
- Columnas cubiertas en `ack-vs-po-demo` (schema viejo, solo Qty disponible):
  - `qtyDiff` → PO Qty + ACK Qty solamente

### Upload PDFs UX · dropzone modal

- **Trigger button** en toolbar: `bg-primary text-primary-foreground` lime CTA con icono UploadCloud
- **Click → modal opens** (headless-ui Dialog con scrim 40% + backdrop blur)
- **Modal panel** 720×~307 centrado, `bg-card border-border rounded-2xl shadow-2xl`
- **Header** 24px padding: título "Upload PDFs for comparison" + descripción + X close
- **Dropzone** dashed border 2px `border-border`, rounded 12, py-10 px-8:
  - Halo circle 64×64 `bg-brand-300/30 dark:bg-brand-500/20` con UploadCloud icon 32×32
  - Text block VERTICAL right-of-icon: "Drop PDFs here" (18 bold) + "or **click to browse**" (14, underlined foreground) + "PDF ONLY · UP TO 2 FILES" (10 uppercase muted-foreground)
  - Drag-over state: `border-primary bg-primary/10`
  - `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space → keyboard accessible
- **Footer** 12px padding · Cancel button muted-foreground

### Post-Accept row state · pill + Undo

Cuando el user clica Accept ACK o Keep PO en una diff row:

- **Accept ACK** clicked → row muestra:
  - Pill `bg-info/15 text-info border-info/30` (light lavender · matches original button color)
  - Text "Accepted ACK" con CheckCircle2 icon prefix
  - "↺ Undo" link debajo (10px muted-foreground)
  - El "× Differs" label anterior desaparece
- **Keep PO** clicked → row muestra:
  - Pill `bg-foreground/10 text-foreground border-foreground/20` (dark · matches original button color)
  - Text "Kept PO"
  - "↺ Undo" link debajo
- **Undo** clicked → resolutions.delete(li.line) → row vuelve al estado pending (Accept ACK / Keep PO buttons visible)
- **Header counter** cambia de "X of N discrepancies resolved" (red) a "N of N discrepancies resolved" (green) cuando `resolutions.size === diffCount`
- **Confirm decisions** primary CTA en footer → dispatcha `CustomEvent('ack-vs-po:compare-committed')` con el batch

---

## Repo divergences · matriz de features (2026-09-10)

| Feature | strata-experiences-demo | expert-hub | ack-vs-po-demo |
|---|---|---|---|
| CORE-parity table (Fase 2.D · stacked PO/ACK) | ✅ | ❌ (OLD 7-col) | ❌ (OLD 7-col) |
| Column highlight (per-cell full-height) | ✅ (5 cols) | ❌ | ✅ (Qty only · schema-limited) |
| Upload PDFs modal (dropzone + browse) | ✅ | ❌ | ❌ |
| Post-Accept pills + Undo (visible en modal) | ✅ | ✅ (native code) | ✅ (native code) |
| Action Center notif con Bell red-dot | ✅ | ✅ | ✅ |
| Line Items filter "only discrepancies" checkbox | ✅ | ✅ | ✅ |
| Column highlight en Figma spec | ✅ | N/A | N/A |

**Decisión Diego 2026-09-10**: NO propagar el col-highlight fix a `expert-hub` en esta iteración. Follow-up ticket para portar Fase 2.D refactor completo + col-highlight.

**Nota importante**: `ack-vs-po-demo` normalmente se rige por la regla "NO editar `src/components/comparison/*` directo" (debe sincronizarse desde expert-hub). En este caso Diego autorizó explícitamente la excepción — el proyecto queda con un divergence intencional hasta que expert-hub se actualice.

---

## Design tokens usados (LAWS-compliant)

**Semantic tokens** (LAW 1-7 · siempre preferidos)
- Backgrounds: `bg-primary`, `bg-primary-foreground`, `bg-card`, `bg-background`, `bg-muted`, `bg-foreground/40` (scrim)
- Text: `text-foreground`, `text-primary-foreground`, `text-muted-foreground`, `text-info`, `text-success`, `text-destructive`
- Borders: `border-border`, `border-primary`, `border-info/30`
- Halos: `bg-brand-300/30 dark:bg-brand-500/20` (icon container lime tint)
- Info variant (pill Accepted ACK): `bg-info/15 text-info border-info/30`

**Raw utilities** (justified · no semantic equivalent)
- `bg-red-100 dark:bg-red-500/20` — col-highlight cell bg (no semantic token existe en DS para "diff cell bg saturated"; los tokens `destructive/*` son para errors/destructive actions, no para "differs" state)
- Documentar en follow-up: crear semantic token `bg-diff-cell` en Strata DS

---

## Files touched · 2026-09-10 session

### strata-experiences-demo
- `src/blocks/prod-imports/deps/comparison/ComparisonReviewModal.tsx` · col-highlight fix (5 cols · qty/cost/total/ship)
- `src/features/ack-vs-po/AckVsPoIntakeBar.tsx` · refactor completo del intake · modal con dropzone + click-to-browse en lugar de native file picker directo

### ack-vs-po-demo
- `src/components/comparison/ComparisonReviewModal.tsx` · col-highlight fix adaptado al schema viejo (solo Qty · única col donde el schema tiene diff detection)

### Figma file `WSroSgo2lFORHu15GtMoiC` (Strata · ACK vs PO ST-1169)
- Consolidación de 4 pages → 1 page: `🎯 All views · ACK vs PO (comparison)`
- 4 secciones horizontales storyboards:
  - Overview · 6 frames (Grid → Processing → Line Items all → Line Items only-diffs filter → POST-ACCEPT pills → Accepted success)
  - Flow A · 6 frames (Grid bell red-dot → Popover → Processing → Report all pending → Report POST-ACCEPT → Success toast)
  - Flow B · 6 frames (Grid → Upload modal → Processing OCR → Report all pending → Report POST-ACCEPT → Success toast)
  - Card Compare · 4 frames (Grid hover → Report all → Report only-diffs → Report mid-progress)
- 3 fixes generalizados aplicados en 17 instancias cada uno:
  - Avatar bg oscurecido (variable `border` · más visible)
  - Toolbar spacing `SPACE_BETWEEN → MIN` (bug donde spacer con layoutGrow=1 anulaba itemSpacing)
  - LayoutGrid icon stroke lightened (variable `muted-foreground`)
- Post-accept pills en 4 clones (Card-4 · Overview · Flow-A-4b · Flow-B-4b): Accepted ACK lavender + Kept PO dark + Undo link + hide × Differs

---

## Anexos

### Referencia CORE (Officeworks compare view baseline)
- Fecha captura: 2026-09-09
- Cantidad: 20+ screencaps del compare real
- Elementos observados y replicados:
  - Toolbar superior con Save Override + Accept Acknowledgement CTAs
  - Sección "Unmatched Lines [N]" separada (urgencia primero)
  - Tabla "Lines" con layout apilado PO/vendor
  - Diff highlight per-cell con fondo rosa/rojo suave (~`#FDE7E7`)
  - Match/No column indicando auto-match del system
  - Bulk actions con checkboxes
- Elementos NO replicados (nuestro value-add):
  - Summary agregada de discrepancias · severity ranking · pre-Accept preview · confidence badges por campo · filter by discrepancy type · progressive disclosure · suggested action inline
- CORE score UX (Nielsen + Krug): 5.5/10 · target Strata post-ST-1169: 8-9/10

### Video del proceso manual (12 pasos)
- Compartido por CEO Matt Danyliw
- Documenta el pain point catastrófico donde el user accepta todas las líneas sin ver diffs
- Screencaps del video sirven como evidencia del "before state" que ST-1169 elimina

---

## Follow-ups · post-ST-1169

1. **Portar Fase 2.D refactor a expert-hub SOT** · replace OLD 7-col table por CORE-parity stacked table + apply col-highlight · re-sync ack-vs-po-demo después (elimina el divergence intencional)
2. **Publicar Dealer library update en Figma** · avatar accessibility fix (purple bg + white DZ text) + los 3 fixes generalizados (avatar bg darker · toolbar spacing MIN · LayoutGrid icon muted) · propagar a Expert Hub + Quote Converter consumers
3. **Consolidar duplicación con Transactions** · el módulo Transactions muestra grids similares · unificar en post-ST-1169 ticket
4. **Wire real backend** · Fase 3 conecta al sistema real (Officeworks CORE via SuiteQL/REST) · reemplaza mocks · CEO habla de V1 mock, tech lead lo lleva a prod después
5. **Crear semantic token `bg-diff-cell`** en Strata DS para el col-highlight · reemplaza el raw `bg-red-100 dark:bg-red-500/20`
6. **Push a los 3 repos** · `strata-experiences-demo` · `expert-hub` (sin cambios · git status clean) · `ack-vs-po-demo` · esperando approval verbal del user

---

## Testing checklist · pre-review

Cuando se corre `:8095`, `:8096`, `:8089`:

- [ ] `:8095` main experiences · verificar Comparisons view existente funciona sin regresiones
- [ ] `:8096` ACK vs PO profile · verificar Upload PDFs button → abre modal centrado con dropzone
- [ ] `:8096` verificar drag-and-drop de PDFs sobre el modal funciona
- [ ] `:8096` verificar click en dropzone → abre file picker nativo
- [ ] `:8096` verificar Compare modal muestra col-highlight en columnas diff (Qty · Cost · Total · Ship)
- [ ] `:8096` verificar Action Center notif → popover flotante (no scrim) → click Compare with PO → processing → modal
- [ ] `:8089` ack-vs-po standalone · verificar Compare modal muestra col-highlight en Qty column
- [ ] `:8089` verificar upload/compare flow completo funciona post-fix
- [ ] Type check: `npx tsc --noEmit` en ambos repos → EXIT 0 ✅ (verificado)
- [ ] Vite build: `npx vite build` en ambos repos → EXIT 0 ✅ (verificado)

---

## Referencias

- Ticket: ST-1169 (Linear/Jira)
- Plan detallado: `~/.claude/plans/cuddly-greeting-meadow.md`
- CORE screencaps: [archivar en `strata-docs/03-governance-docs/` post-review]
- Manual 12-step video: [compartido por CEO · pendiente de archive]
- Figma spec: [Strata · ACK vs PO ST-1169](https://www.figma.com/design/WSroSgo2lFORHu15GtMoiC/)
