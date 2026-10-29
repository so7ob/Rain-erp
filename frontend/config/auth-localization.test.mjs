import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { scanSource, walk } from './localization.mjs'

const root = fileURLToPath(new URL('../src/views/', import.meta.url))

test('authentication and profile display literals stay extracted into catalogs', () => {
  const findings = []
  for (const directory of ['Login', 'Profile']) {
    for (const file of walk(path.join(root, directory)).filter((file) => file.endsWith('.vue'))) {
      const scan = scanSource(fs.readFileSync(file, 'utf8'), file)
      assert.deepEqual(scan.errors, [], file)
      findings.push(
        ...scan.findings.map(
          (finding) => `${path.relative(root, file)}:${finding.line}: ${finding.text}`
        )
      )
    }
  }
  assert.deepEqual(findings, [])
})

test('remaining Chinese script literals are precisely bounded original tenant identifiers', () => {
  const allowed = new Set(['Login/SocialLogin.vue', 'Login/components/MobileForm.vue'])
  const seen = new Set()
  for (const directory of ['Login', 'Profile']) {
    for (const file of walk(path.join(root, directory)).filter((file) => file.endsWith('.vue'))) {
      const relative = path.relative(root, file).split(path.sep).join('/')
      const { descriptor } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
      for (const block of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
        const ast = ts.createSourceFile(file + '.ts', block.content, ts.ScriptTarget.Latest, true)
        const visit = (node) => {
          if (ts.isStringLiteralLike(node) && /\p{Script=Han}/u.test(node.text)) {
            const parent = node.parent
            assert.ok(
              allowed.has(relative) &&
                node.text === '芋道源码' &&
                ts.isPropertyAssignment(parent) &&
                parent.name.getText(ast) === 'tenantName',
              `Untranslated script literal: ${relative}: ${node.text}`
            )
            seen.add(relative)
          }
          ts.forEachChild(node, visit)
        }
        visit(ast)
      }
    }
  }
  assert.deepEqual(seen, allowed)
})
