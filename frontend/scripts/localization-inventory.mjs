import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCatalogs, scanSource, validateCatalogs, walk } from '../config/localization.mjs'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const repository = path.dirname(frontend)
const output = path.join(repository, 'docs/localization-inventory.json')
const options = new Set(process.argv.slice(2))
const catalogs = readCatalogs(path.join(frontend, 'src/locales'))
const catalogProblems = validateCatalogs(catalogs)
if (catalogProblems.length) {
  console.error(catalogProblems.join('\n'))
  process.exit(1)
}

const modules = {}
const details = []
for (const file of walk(path.join(frontend, 'src')).filter((file) =>
  /\.(vue|[jt]sx?)$/u.test(file)
)) {
  const relative = path.relative(frontend, file).split(path.sep).join('/')
  if (relative.startsWith('src/locales/') || relative.endsWith('.d.ts')) continue
  const module = relative.startsWith('src/views/') ? relative.split('/')[2] : 'shared'
  const record = (modules[module] ??= {
    status: 'pending-acceptance',
    files: 0,
    vueFiles: 0,
    visibleLiteralCandidates: 0,
    templateParseErrors: 0,
    kinds: {},
    examples: []
  })
  record.files++
  if (file.endsWith('.vue')) record.vueFiles++
  const scan = scanSource(fs.readFileSync(file, 'utf8'), file)
  record.visibleLiteralCandidates += scan.findings.length
  record.templateParseErrors += scan.errors.length
  for (const finding of scan.findings) {
    record.kinds[finding.kind] = (record.kinds[finding.kind] ?? 0) + 1
    const item = { file: relative, ...finding }
    if (record.examples.length < 3) record.examples.push(item)
    if (options.has('--details')) details.push(item)
  }
  for (const error of scan.errors) details.push({ file: relative, error })
}

const backend = {}
for (const directory of fs.readdirSync(repository).filter((name) => name.startsWith('yudao-'))) {
  const record = {
    javaFiles: 0,
    businessErrorConstants: 0,
    excelHeaders: 0,
    validationMessages: 0,
    status: 'pending-acceptance'
  }
  for (const file of walk(path.join(repository, directory)).filter(
    (file) => file.includes(`${path.sep}src${path.sep}main${path.sep}`) && file.endsWith('.java')
  )) {
    const source = fs.readFileSync(file, 'utf8')
    record.javaFiles++
    record.businessErrorConstants += [...source.matchAll(/\bnew ErrorCode\s*\(/gu)].length
    record.excelHeaders += [...source.matchAll(/@ExcelProperty\s*\(/gu)].length
    record.validationMessages += [...source.matchAll(/@\w+\s*\([^)]*\bmessage\s*=/gu)].length
  }
  backend[directory] = record
}

const inventory = {
  schemaVersion: 1,
  trackingIssue: 15,
  definition:
    'Candidate counts are work discovery, not completed translation or a percentage. Every module needs linguistic, API/output and browser acceptance.',
  scannerLimits:
    'Vue visible text/attributes/expressions and contextual JS/TS display literals are detected. Runtime-generated strings, CSS content, third-party UIs, images, backend dynamic outputs and user-authored data need separate review. Java counts are inventory only, not a proof of extraction.',
  catalogs: Object.fromEntries(
    Object.entries(catalogs).map(([locale, catalog]) => [locale, { keys: catalog.size }])
  ),
  frontend: Object.fromEntries(
    Object.entries(modules).sort(([a], [b]) => a.localeCompare(b, 'en'))
  ),
  backend
}
const serialized = JSON.stringify(inventory, null, 2) + '\n'
if (options.has('--write')) fs.writeFileSync(output, serialized)
if (
  options.has('--check') &&
  (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized)
) {
  console.error(
    'Localization inventory changed. Run corepack pnpm i18n:inventory and review the coverage delta.'
  )
  process.exitCode = 1
}
if (options.has('--details')) console.log(JSON.stringify({ inventory, findings: details }, null, 2))
else
  console.log(
    JSON.stringify(
      {
        catalogs: inventory.catalogs,
        frontendModules: Object.keys(modules).length,
        visibleLiteralCandidates: Object.values(modules).reduce(
          (sum, module) => sum + module.visibleLiteralCandidates,
          0
        ),
        templateParseErrors: Object.values(modules).reduce(
          (sum, module) => sum + module.templateParseErrors,
          0
        ),
        acceptedModules: 0,
        acceptance: 'pending'
      },
      null,
      2
    )
  )
if (options.has('--accept')) {
  console.error(
    'Full localization acceptance is pending under Issue #15; catalog parity alone does not establish completion.'
  )
  process.exitCode = 1
}
