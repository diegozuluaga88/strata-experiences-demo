#!/usr/bin/env node
// strata-experiences-demo · security scanner
//
// Escanea el repo por el payload malicioso documentado en SECURITY.md.
// Exit code 1 si detecta hits · 0 si limpio.
//
// Corrido automáticamente por `npm run build` (guard) · también manual:
//   node scripts/scan-security.mjs
//
// Se usa sin dependencias externas (fs + regex) para que no dependa de
// npm install · queda operativo aún en un clone recién hecho.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/* ─── Signature ────────────────────────────────────────────────────────
   Patterns característicos del payload obfuscado. Basta con que UNO
   matchee para marcar el archivo como infectado.

   Variantes conocidas:
   1. RAW · el payload al final del file · pattern _$_aeb0 + global.o=
      + Tmx('sorcpf...') + rEf(4950).
   2. EVAL+ATOB (jul 14 post-cleanup) · `eval("global.o=..." + atob('...'))`
      · el payload real vive base64-encoded, decode + eval en runtime.
      atob('dmFyIF8kX2FlYjA=') === "var _$_aeb0=" (start of raw payload).
   3. CREATE_REQUIRE prelude · `import { createRequire } from 'module';
      const require = createRequire(import.meta.url);` al inicio del
      file · solo dispara la evaluación posterior · no siempre malware
      pero altamente sospechoso en archivos que originalmente no lo tenían. */
const PATTERNS = [
    /_\$_[0-9a-f]{4}/,                   // v1/v3 shuffler · aeb0, 7752, y cualquier sufijo hex
    /global\.[a-z]='5-2-234/,            // v1/v2/v3 marker · global.o='5-2-234-du', global.i='5-2-234'
    /global\[["']e["']\]='NPM'/,         // v3 marker
    /\/\*(C260521A|RS260605)\*\//,       // v3 build stamps
    /Tmx\('sorcpf/,                      // v1 decoder function
    /rEf\(4950\)/,                       // v1 entry point call
    /eval\(["']global\.o=/,              // v2 eval wrapper
    /atob\(["']dmFyIF8kX2FlYjA/,         // v2 base64-encoded "var _$_aeb0="
]

/* ─── Directorios a excluir ─────────────────────────────────────────── */
const EXCLUDE_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.vercel',
    'coverage',
])

/* ─── Extensiones a escanear ────────────────────────────────────────── */
const EXTENSIONS = new Set([
    '.mjs', '.cjs', '.js',
    '.mts', '.cts', '.ts',
    '.tsx', '.jsx',
    '.json',
])

/* ─── Archivos excluidos (documentan el pattern intencionalmente) ────── */
const EXCLUDE_FILES = new Set([
    // El scanner mismo · contiene los patterns literales.
    'scripts/scan-security.mjs',
    // Docs de seguridad · SECURITY.md no está en EXTENSIONS pero
    // dejamos otros posibles paths por si algún doc migrara a .ts/.mjs.
    'SECURITY.md',
])

function walk(dir, hits) {
    let entries
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return
    }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (EXCLUDE_DIRS.has(entry.name)) continue
            walk(path.join(dir, entry.name), hits)
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name)
            if (!EXTENSIONS.has(ext)) continue
            const filePath = path.join(dir, entry.name)
            const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/')
            if (EXCLUDE_FILES.has(relPath)) continue
            let content
            try {
                content = fs.readFileSync(filePath, 'utf-8')
            } catch {
                continue
            }
            for (const pattern of PATTERNS) {
                if (pattern.test(content)) {
                    hits.push({ file: path.relative(ROOT, filePath), pattern: pattern.source })
                    break
                }
            }
        }
    }
}

const startedAt = Date.now()
const hits = []
walk(ROOT, hits)
const elapsedMs = Date.now() - startedAt

if (hits.length === 0) {
    console.log(`✅ security-scan · clean (${elapsedMs}ms)`)
    process.exit(0)
}

console.error('')
console.error('╔══════════════════════════════════════════════════════════════╗')
console.error('║ 🛑  SECURITY · MALWARE PATTERN DETECTED                      ║')
console.error('╚══════════════════════════════════════════════════════════════╝')
console.error('')
console.error(`${hits.length} file(s) infected:`)
for (const h of hits) {
    console.error(`  · ${h.file}   [${h.pattern}]`)
}
console.error('')
console.error('Ver SECURITY.md · procedimiento de limpieza.')
console.error('')
process.exit(1)