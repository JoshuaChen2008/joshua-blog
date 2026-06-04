import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_FIELDS = ['url', 'nick', 'comment', 'createdAt']
const OPTIONAL_FIELDS = ['mail', 'link', 'pid', 'rid', 'at', 'ua']

export function normalizeWalinePath(value) {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return ''

  let pathname = rawValue
  try {
    pathname = new URL(rawValue).pathname
  } catch {
    pathname = rawValue.split(/[?#]/, 1)[0]
  }

  pathname = pathname.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  if (!pathname.startsWith('/')) pathname = `/${pathname}`

  try {
    return encodeURI(decodeURI(pathname))
  } catch {
    return encodeURI(pathname)
  }
}

export function validateHistoricalComment(input) {
  return REQUIRED_FIELDS.flatMap((field) => {
    const value = input?.[field]
    return String(value ?? '').trim() ? [] : [`${field} is required`]
  })
}

export function formatHistoricalComment(input) {
  const errors = validateHistoricalComment(input)
  if (errors.length) {
    throw new Error(errors.join('; '))
  }

  const formatted = {
    url: normalizeWalinePath(input.url),
    nick: String(input.nick).trim(),
    mail: '',
    link: '',
    comment: String(input.comment).trim(),
    createdAt: new Date(input.createdAt).toISOString(),
    pid: '',
    rid: '',
    at: '',
    ua: '',
    status: String(input.status ?? 'approved').trim() || 'approved'
  }

  for (const field of OPTIONAL_FIELDS) {
    if (input[field] != null) formatted[field] = String(input[field]).trim()
  }

  return formatted
}

async function main() {
  const [, , inputPath, outputPath] = process.argv
  if (!inputPath) {
    console.error('Usage: node scripts/waline/history-format.js <input.json> [output.json]')
    process.exitCode = 1
    return
  }

  const raw = await readFile(inputPath, 'utf8')
  const records = JSON.parse(raw)
  if (!Array.isArray(records)) {
    throw new Error('Input JSON must be an array of comment records.')
  }

  const formatted = records.map((record, index) => {
    try {
      return formatHistoricalComment(record)
    } catch (error) {
      throw new Error(`Record ${index + 1}: ${error.message}`)
    }
  })

  const output = `${JSON.stringify(formatted, null, 2)}\n`
  if (outputPath) {
    await writeFile(outputPath, output, 'utf8')
  } else {
    process.stdout.write(output)
  }
}

const currentFile = fileURLToPath(import.meta.url)
if (basename(process.argv[1] ?? '') === basename(currentFile)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
