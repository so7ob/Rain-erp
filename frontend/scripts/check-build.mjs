import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { readProjectVersion } from '../config/project.mjs'

const directory = resolve(process.argv[2] || 'dist')
const metadata = JSON.parse(readFileSync(resolve(directory, 'version.json'), 'utf8'))
assert.equal(metadata.name, 'Rain-erp')
assert.equal(metadata.version, readProjectVersion(), 'Built frontend version must match Maven')
const html = readFileSync(resolve(directory, 'index.html'), 'utf8')
assert(!/%VITE_[A-Z_]+%/.test(html), 'HTML must not retain unresolved environment placeholders')
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
assert(scripts.length > 0, 'Production HTML must load a JavaScript entry')
for (const [, src] of scripts) {
  const asset = resolve(directory, new URL(src, 'http://localhost').pathname.replace(/^\//, ''))
  assert(asset.startsWith(directory + sep), 'Script must stay inside the build directory')
  assert(statSync(asset).size > 0, 'Entry script must exist and be nonempty')
}
console.log(JSON.stringify({ name: metadata.name, version: metadata.version, scripts: scripts.length }))
