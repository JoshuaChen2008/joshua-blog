import { parse, stringify } from 'yaml'

import { COLLECTION_CONFIG, fieldOf, FIELDS, fieldsOf, type FieldDescriptor } from './schema'
import type { ContentCollection } from './shared'

export { COLLECTION_CONFIG, FIELDS, fieldOf, fieldsOf } from './schema'

export interface ParsedFrontmatter {
  readonly fields: Record<string, unknown>
  readonly unknown: Record<string, unknown>
  readonly body: string
  readonly hasFrontmatter: boolean
  readonly suggested: readonly string[]
}

type EnabledFields = Iterable<string> | undefined

const FRONTMATTER_PATTERN = /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)/u

export function renderFrontmatter(
  collection: ContentCollection,
  values: Readonly<Record<string, unknown>>,
  enabled?: EnabledFields,
  unknown: Readonly<Record<string, unknown>> = {}
): string {
  const style = COLLECTION_CONFIG[collection].style
  const enabledNames = new Set(enabled ?? Object.keys(values))
  const lines = ['---']

  for (const field of fieldsOf(collection)) {
    if (!field.required && !enabledNames.has(field.name)) continue

    const value = values[field.name]
    if (isEmptyValue(value, field.required)) continue

    const serialized = serializeField(field, value, style)
    if (serialized !== null) lines.push(serialized)
  }

  const knownNames = new Set(fieldsOf(collection).map((field) => field.name))
  const preservedEntries = Object.entries(unknown).filter(([name]) => !knownNames.has(name))
  if (preservedEntries.length > 0) {
    const preserved = stringify(Object.fromEntries(preservedEntries), { lineWidth: 0 }).trimEnd()
    if (preserved) lines.push(preserved)
  }

  lines.push('---')
  return lines.join('\n')
}

export function renderDocument(
  collection: ContentCollection,
  values: Readonly<Record<string, unknown>>,
  enabled: EnabledFields,
  body: string,
  unknown: Readonly<Record<string, unknown>> = {}
): string {
  const normalizedBody = body.replace(/\r\n?/gu, '\n').replace(/^\n+|\s+$/gu, '')
  return `${renderFrontmatter(collection, values, enabled, unknown)}\n\n${normalizedBody}${normalizedBody ? '\n' : ''}`
}

/**
 * 解析一整篇文章。纯正文也会返回建议字段；只有检测到 frontmatter 但 YAML 无效时返回 null。
 */
export function parseFrontmatter(
  raw: string,
  collection?: ContentCollection
): ParsedFrontmatter | null {
  const normalized = raw.replace(/^\uFEFF/u, '')
  const match = normalized.match(FRONTMATTER_PATTERN)

  if (!match) {
    if (normalized.startsWith('---')) return null
    return parsePlainBody(normalized)
  }

  let parsed: unknown
  try {
    parsed = parse(match[1] ?? '')
  } catch {
    return null
  }

  if (parsed !== null && (!isPlainObject(parsed) || Array.isArray(parsed))) return null

  const data = (parsed ?? {}) as Record<string, unknown>
  const knownNames = new Set(
    collection ? fieldsOf(collection).map((field) => field.name) : FIELDS.map((field) => field.name)
  )
  const fields: Record<string, unknown> = {}
  const unknown: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(data)) {
    if (knownNames.has(name)) {
      const descriptor = collection
        ? fieldOf(collection, name)
        : FIELDS.find((field) => field.name === name)
      fields[name] =
        descriptor?.type === 'date' ? formatDateValue(value) : normalizeParsedValue(value)
    } else {
      unknown[name] = normalizeParsedValue(value)
    }
  }

  return {
    fields,
    unknown,
    body: normalized.slice(match[0].length).replace(/^\n+|\s+$/gu, ''),
    hasFrontmatter: true,
    suggested: []
  }
}

function parsePlainBody(raw: string): ParsedFrontmatter {
  let body = raw.replace(/\r\n?/gu, '\n')
  const fields: Record<string, unknown> = {}
  const suggested: string[] = []
  const heading = body.match(/^\s*#\s+(.+?)\s*$/mu)

  if (heading) {
    fields.title = heading[1]
    suggested.push('title')
    body = body.replace(heading[0], '')
  }

  const paragraph = body
    .split(/\n\s*\n/gu)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith('#') && !part.startsWith('```'))

  if (paragraph) {
    const flattened = paragraph.replace(/\s+/gu, ' ')
    fields.description = flattened.length > 160 ? `${flattened.slice(0, 159)}…` : flattened
    suggested.push('description')
  }

  return {
    fields,
    unknown: {},
    body: body.replace(/^\n+|\s+$/gu, ''),
    hasFrontmatter: false,
    suggested
  }
}

function serializeField(
  field: FieldDescriptor,
  value: unknown,
  style: (typeof COLLECTION_CONFIG)[ContentCollection]['style']
): string | null {
  switch (field.type) {
    case 'date':
      return `${field.name}: ${String(value)}`
    case 'boolean':
      return `${field.name}: ${value ? 'true' : 'false'}`
    case 'tags':
    case 'entryRef': {
      const values = Array.isArray(value) ? value.map(String) : []
      if (values.length === 0) return null
      return style.tags === 'inline'
        ? `${field.name}: [${values.map((item) => quoteString(item, style.quote)).join(',')}]`
        : `${field.name}:\n${values.map((item) => `  - ${item}`).join('\n')}`
    }
    case 'heroImage': {
      if (
        !isPlainObject(value) ||
        typeof value.src !== 'string' ||
        typeof value.color !== 'string'
      ) {
        return null
      }
      return `${field.name}: { src: ${quoteString(value.src, style.quote)}, color: ${quoteString(value.color, style.quote)} }`
    }
    default:
      return `${field.name}: ${quoteString(String(value), style.quote)}`
  }
}

function quoteString(value: string, quote: "'" | '"'): string {
  return quote === "'" ? `'${value.replaceAll("'", "''")}'` : JSON.stringify(value)
}

function isEmptyValue(value: unknown, required: boolean): boolean {
  return (
    value === undefined ||
    value === null ||
    (Array.isArray(value) && value.length === 0) ||
    (!required && typeof value === 'string' && value === '')
  )
}

function formatDateValue(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return singaporeDate(value)
  }

  if (typeof value === 'string') {
    const exact = value.match(/^(\d{4})-(\d{2})-(\d{2})/u)
    if (exact) return `${exact[1]}-${exact[2]}-${exact[3]}`

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.valueOf())) return singaporeDate(parsed)
  }

  return value
}

function singaporeDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function normalizeParsedValue(value: unknown): unknown {
  if (value instanceof Date) return singaporeDate(value)
  if (Array.isArray(value)) return value.map(normalizeParsedValue)
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeParsedValue(nestedValue)])
    )
  }
  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
