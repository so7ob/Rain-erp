import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'

const displayProperties = new Set([
  'label',
  'title',
  'text',
  'message',
  'placeholder',
  'description',
  'content',
  'alt',
  'aria-label',
  'empty-text',
  'header',
  'tip',
  'tooltip',
  'confirmButtonText',
  'cancelButtonText',
  'loading-text',
  'no-data-text',
  'no-match-text',
  'unit'
])
const readable = (value) => typeof value === 'string' && /\p{L}/u.test(value)
const translatedCall = (node) =>
  ts.isCallExpression(node) &&
  (node.expression.getText() === 't' || node.expression.getText().endsWith('.t'))

export function flattenCatalog(catalog, prefix = '', result = new Map()) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error(`Catalog branch must be an object: ${prefix}`)
  }
  for (const [key, value] of Object.entries(catalog)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new Error(`Unsafe catalog key: ${name}`)
    }
    if (typeof value === 'string' && value.trim()) {
      if (result.has(name)) throw new Error(`Duplicate catalog key: ${name}`)
      result.set(name, value)
    } else if (typeof value === 'object' && value !== null) flattenCatalog(value, name, result)
    else throw new Error(`Catalog entry must be a nonempty string: ${name}`)
  }
  return result
}

export function readCatalogs(directory) {
  if (directory instanceof URL) directory = fileURLToPath(directory)
  const result = {}
  for (const locale of ['ar', 'en', 'zh-CN']) {
    const entries = new Map()
    for (const file of walk(path.join(directory, locale)).filter((file) =>
      file.endsWith('.json')
    )) {
      flattenCatalog(JSON.parse(fs.readFileSync(file, 'utf8')), '', entries)
    }
    result[locale] = entries
  }
  return result
}

export function placeholders(message) {
  // Named/list placeholders; literal interpolation ({'@'}) is not a parameter.
  return [...new Set([...message.matchAll(/\{([\w]+)\}/gu)].map((match) => match[1]))].sort()
}

export function validateCatalogs(catalogs) {
  const problems = []
  const keys = new Set(Object.values(catalogs).flatMap((catalog) => [...catalog.keys()]))
  for (const key of keys) {
    const reference = Object.values(catalogs)
      .find((catalog) => catalog.has(key))
      .get(key)
    for (const [locale, catalog] of Object.entries(catalogs)) {
      if (!catalog.has(key)) problems.push(`${locale}: missing ${key}`)
      else if (
        JSON.stringify(placeholders(catalog.get(key))) !== JSON.stringify(placeholders(reference))
      ) {
        problems.push(`${locale}: placeholder mismatch for ${key}`)
      }
    }
  }
  return problems
}

export function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)]
    )
}

export function scanSource(source, filename) {
  const findings = []
  const errors = []
  const keys = new Set()
  const add = (value, offset, kind) => {
    if (!readable(value)) return
    findings.push({ line: source.slice(0, offset).split('\n').length, kind, text: value.trim() })
  }
  const script = (
    code,
    offset = 0,
    expression = false,
    jsx = filename.endsWith('.tsx') || filename.endsWith('.jsx')
  ) => {
    const prefix = expression ? 'const __display = (' : ''
    const ast = ts.createSourceFile(
      filename + '.tsx',
      prefix + code + (expression ? ')' : ''),
      ts.ScriptTarget.Latest,
      true,
      jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )
    const visit = (node) => {
      if (ts.isJsxText(node)) add(node.text, offset + node.getStart(ast), 'jsx')
      if (
        translatedCall(node) &&
        node.arguments.length &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        keys.add(node.arguments[0].text)
      }
      if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
        const parent = node.parent
        const property = ts.isPropertyAssignment(parent)
          ? parent.name.getText(ast).replace(/^['"]|['"]$/g, '')
          : ''
        const attribute = ts.isJsxAttribute(parent) ? parent.name.getText(ast) : ''
        let ancestor = parent
        while (ancestor && !ts.isJsxExpression(ancestor) && !ts.isStatement(ancestor))
          ancestor = ancestor.parent
        const jsxExpression = ancestor && ts.isJsxExpression(ancestor)
        const isMessageCall =
          ts.isCallExpression(parent) &&
          /(?:message|Message|notification|Notification|alert|confirm)(?:\.(?:error|success|warning|info|confirm|alert))?$/u.test(
            parent.expression.getText(ast)
          )
        if (
          !translatedCall(parent) &&
          (displayProperties.has(property) ||
            displayProperties.has(attribute) ||
            isMessageCall ||
            expression ||
            jsxExpression)
        ) {
          add(
            ts.isTemplateExpression(node) ? node.getText(ast) : node.text,
            offset + Math.max(0, node.getStart(ast) - prefix.length),
            'script'
          )
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  if (!filename.endsWith('.vue')) script(source)
  else {
    const { descriptor, errors: parsingErrors } = parse(source, { filename })
    errors.push(...parsingErrors.map(String))
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (block)
        script(
          block.content,
          block.loc.start.offset,
          false,
          block.lang === 'tsx' || block.lang === 'jsx'
        )
    }
    if (descriptor.template) {
      const block = descriptor.template
      const ast = parseTemplate(block.content, { onError: (error) => errors.push(String(error)) })
      const visit = (node) => {
        if (node.type === 2)
          add(node.content, block.loc.start.offset + node.loc.start.offset, 'template')
        if (node.type === 5)
          script(node.content.content, block.loc.start.offset + node.content.loc.start.offset, true)
        if (node.type === 1) {
          for (const prop of node.props) {
            if (prop.type === 6 && displayProperties.has(prop.name) && prop.value) {
              add(prop.value.content, block.loc.start.offset + prop.loc.start.offset, 'attribute')
            } else if (
              prop.type === 7 &&
              prop.exp &&
              prop.name === 'bind' &&
              displayProperties.has(prop.arg?.content)
            ) {
              script(prop.exp.content, block.loc.start.offset + prop.exp.loc.start.offset, true)
            }
          }
        }
        for (const child of node.children ?? []) visit(child)
        for (const branch of node.branches ?? []) visit(branch)
      }
      visit(ast)
    }
  }
  const unique = [
    ...new Map(findings.map((finding) => [`${finding.line}:${finding.text}`, finding])).values()
  ]
  return { findings: unique, errors, keys: [...keys].sort() }
}
