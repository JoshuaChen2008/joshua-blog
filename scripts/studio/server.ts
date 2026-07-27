import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-ignore Bun 在运行时提供该内置模块；是否加载 Bun 类型由调用方的 tsconfig 决定。
import { build, file, serve, spawn } from 'bun'

import { convertBlogCover } from '../blog/cover'
import { createBlog, normalizeMarkdownFileName } from '../blog/create'
import { parseFrontmatter } from '../blog/frontmatter'
import { COLLECTION_CONFIG, fieldOf, FIELDS, fieldsOf } from '../blog/schema'
import {
  ALL_COLLECTIONS,
  assertPathInside,
  assertSafePathSegment,
  BlogToolError,
  deriveEntryId,
  formatError,
  getContentDirectory,
  resolveArticleCollection,
  type ContentCollection
} from '../blog/shared'

interface Preset {
  readonly name: string
  readonly collection: ContentCollection
  readonly enabled: readonly string[]
  readonly fields: Readonly<Record<string, unknown>>
  readonly directoryName?: string
}

const STUDIO_DIR = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = resolve(STUDIO_DIR, '../..')
const PUBLIC_DIR = resolve(STUDIO_DIR, 'public')
const FRONTMATTER_ENTRY = resolve(PROJECT_ROOT, 'scripts/blog/frontmatter.ts')
const PRESETS_PATH = resolve(PROJECT_ROOT, 'scripts/blog/presets.json')
const DEFAULT_PORT = 4399
const MAX_JSON_BYTES = 1024 * 1024
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const browserBundle = await buildBrowserFrontmatter()
const port = parsePort(process.argv.slice(2))

const server = serve({
  hostname: '127.0.0.1',
  port,
  development: true,

  async fetch(request: Request) {
    const url = new URL(request.url)

    try {
      if (url.pathname.startsWith('/api/')) return await routeApi(request, url)
      if (url.pathname === '/app/frontmatter.js') {
        return new Response(browserBundle, {
          headers: { 'Content-Type': 'text/javascript; charset=utf-8' }
        })
      }
      return await serveStatic(url.pathname)
    } catch (error) {
      return errorResponse(error)
    }
  }
})

console.log(`Blog Studio  →  http://127.0.0.1:${server.port}`)

async function routeApi(request: Request, url: URL): Promise<Response> {
  const { pathname } = url

  if (request.method === 'GET' && pathname === '/api/meta') {
    const [{ tags, entries }, presets] = await Promise.all([scanContentMeta(), readPresets()])
    return json({ config: COLLECTION_CONFIG, fields: FIELDS, tags, entries, presets })
  }

  if (request.method === 'POST' && pathname === '/api/check-path') {
    const payload = await readJson(request)
    const target = resolveTarget(payload)
    return json({
      path: target.relativeMarkdownPath,
      exists: await pathExists(target.conflictPath)
    })
  }

  if (request.method === 'POST' && pathname === '/api/create') {
    const payload = await readJson(request)
    const collection = readCollection(payload.collection)
    const fields = readRecord(payload.fields, 'fields')
    const unknown = payload.unknown === undefined ? {} : readRecord(payload.unknown, 'unknown')
    const body = typeof payload.body === 'string' ? payload.body : ''
    validateManagedFields(collection, fields)

    const result = await createBlog({
      projectRoot: PROJECT_ROOT,
      collection,
      directoryName: readOptionalString(payload.directoryName),
      fileName: readOptionalString(payload.fileName),
      fields,
      enabled: Object.keys(fields),
      unknown,
      body
    })

    return json(
      {
        directoryPath: result.directoryPath && projectRelative(result.directoryPath),
        markdownPath: projectRelative(result.markdownPath),
        entryId: result.entryId
      },
      201
    )
  }

  if (request.method === 'POST' && pathname === '/api/cover') {
    return json(await handleCover(request))
  }

  if (request.method === 'GET' && pathname === '/api/presets') return json(await readPresets())

  if (request.method === 'POST' && pathname === '/api/presets') {
    const preset = validatePreset(await readJson(request))
    const presets = await readPresets()
    const index = presets.findIndex((item) => item.name === preset.name)
    if (index === -1) presets.push(preset)
    else presets[index] = preset
    await writePresets(presets)
    return json(presets, 201)
  }

  if (request.method === 'DELETE' && pathname.startsWith('/api/presets/')) {
    const name = decodeURIComponent(pathname.slice('/api/presets/'.length))
    if (!name) throw new BlogToolError('预设名称不能为空')
    const presets = (await readPresets()).filter((preset) => preset.name !== name)
    await writePresets(presets)
    return json(presets)
  }

  if (request.method === 'POST' && pathname === '/api/open') {
    const payload = await readJson(request)
    if (typeof payload.path !== 'string' || !payload.path) throw new BlogToolError('path 不能为空')
    const candidate = assertInsideProject(resolve(PROJECT_ROOT, payload.path))
    const info = await stat(candidate)
    const directory = info.isDirectory() ? candidate : dirname(candidate)
    spawn(['explorer.exe', directory], { stdout: 'ignore', stderr: 'ignore' })
    return json({ ok: true })
  }

  return json({ error: '接口不存在或请求方法不受支持' }, 404)
}

async function handleCover(request: Request): Promise<Record<string, unknown>> {
  assertRequestSize(request, MAX_UPLOAD_BYTES)
  const form = await request.formData()
  const file = form.get('file')
  const markdownValue = form.get('markdownPath')

  if (!(file instanceof File) || file.size === 0) throw new BlogToolError('请选择封面图片')
  if (file.size > MAX_UPLOAD_BYTES) throw new BlogToolError('封面图片不能超过 25 MB')
  if (typeof markdownValue !== 'string' || !markdownValue) {
    throw new BlogToolError('markdownPath 不能为空')
  }

  const markdownPath = assertInsideProject(resolve(PROJECT_ROOT, markdownValue))
  if (!/\.(?:md|mdx)$/iu.test(markdownPath))
    throw new BlogToolError('markdownPath 必须是 Markdown 文件')
  const articleDirectory = dirname(markdownPath)
  resolveArticleCollection(PROJECT_ROOT, articleDirectory)
  const markdownInfo = await stat(markdownPath)
  if (!markdownInfo.isFile()) throw new BlogToolError('找不到刚创建的 Markdown 文件')

  const originalName = basename(file.name || 'cover')
  const originalExtension = extname(originalName)
  const safeExtension = /^\.[a-z0-9]{1,10}$/iu.test(originalExtension) ? originalExtension : '.img'
  const temporaryPath = assertPathInside(
    articleDirectory,
    resolve(articleDirectory, `.studio-upload-${crypto.randomUUID()}${safeExtension}`),
    '封面临时路径'
  )
  const requestedName =
    readFormString(form, 'name') ?? basename(originalName, originalExtension) ?? 'cover'

  await writeFile(temporaryPath, Buffer.from(await file.arrayBuffer()), { flag: 'wx' })
  try {
    const result = await convertBlogCover({
      projectRoot: PROJECT_ROOT,
      inputPath: temporaryPath,
      outputName: requestedName,
      quality: readFormInteger(form, 'quality'),
      width: readFormInteger(form, 'width'),
      color: readFormString(form, 'color'),
      force: readFormBoolean(form, 'force'),
      removeSource: true
    })
    return {
      outputPath: projectRelative(result.outputPath),
      color: result.color,
      markdownPath: projectRelative(result.markdownPath)
    }
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

function resolveTarget(payload: Record<string, unknown>): {
  readonly relativeMarkdownPath: string
  readonly conflictPath: string
} {
  const collection = readCollection(payload.collection)
  const contentRoot = getContentDirectory(PROJECT_ROOT, collection)
  const config = COLLECTION_CONFIG[collection]

  if (config.layout === 'directory') {
    const directoryName = assertSafePathSegment(
      readOptionalString(payload.directoryName) ?? '',
      '目录名'
    )
    const fileName = normalizeMarkdownFileName(readOptionalString(payload.fileName) ?? 'index.md')
    const directoryPath = assertPathInside(
      contentRoot,
      resolve(contentRoot, directoryName),
      '文章目录'
    )
    const markdownPath = assertPathInside(
      contentRoot,
      resolve(directoryPath, fileName),
      'Markdown 路径'
    )
    return { relativeMarkdownPath: projectRelative(markdownPath), conflictPath: directoryPath }
  }

  const fileName = normalizeMarkdownFileName(readOptionalString(payload.fileName) ?? '')
  const markdownPath = assertPathInside(
    contentRoot,
    resolve(contentRoot, fileName),
    'Markdown 路径'
  )
  return { relativeMarkdownPath: projectRelative(markdownPath), conflictPath: markdownPath }
}

function validateManagedFields(
  collection: ContentCollection,
  values: Readonly<Record<string, unknown>>,
  requireRequired = true
): void {
  const descriptors = fieldsOf(collection)
  const knownNames = new Set(descriptors.map((field) => field.name))

  for (const name of Object.keys(values)) {
    if (!knownNames.has(name))
      throw new BlogToolError(`fields 包含不受 ${collection} 管理的字段：${name}`)
  }

  for (const field of descriptors) {
    const value = values[field.name]
    if (requireRequired && field.required && field.type !== 'textarea' && isBlank(value)) {
      throw new BlogToolError(`${field.label}不能为空`)
    }
    if (value === undefined || value === null || value === '') continue
    if (field.maxLength && String(value).length > field.maxLength) {
      throw new BlogToolError(`${field.label}不能超过 ${field.maxLength} 个字符`)
    }
    if (field.type === 'date' && !isCalendarDate(value)) {
      throw new BlogToolError(`${field.label}必须是有效的 YYYY-MM-DD 日期`)
    }
    if (field.type === 'boolean' && typeof value !== 'boolean') {
      throw new BlogToolError(`${field.label}必须是布尔值`)
    }
    if ((field.type === 'tags' || field.type === 'entryRef') && !isStringArray(value)) {
      throw new BlogToolError(`${field.label}必须是字符串数组`)
    }
    if (field.type === 'enum' && !field.options?.includes(String(value))) {
      throw new BlogToolError(`${field.label}不是允许的选项`)
    }
    if (field.type === 'url') {
      try {
        new URL(String(value))
      } catch {
        throw new BlogToolError(`${field.label}必须是合法 URL`)
      }
    }
    if (
      field.type === 'heroImage' &&
      (!isRecord(value) || typeof value.src !== 'string' || typeof value.color !== 'string')
    ) {
      throw new BlogToolError('封面字段格式无效')
    }
  }
}

async function scanContentMeta(): Promise<{
  tags: Record<ContentCollection, Array<{ value: string; count: number }>>
  entries: Record<ContentCollection, string[]>
}> {
  const tags: Record<ContentCollection, Array<{ value: string; count: number }>> = {
    blog: [],
    diary: [],
    note: []
  }
  const entries: Record<ContentCollection, string[]> = { blog: [], diary: [], note: [] }

  await Promise.all(
    ALL_COLLECTIONS.map(async (collection) => {
      const contentRoot = getContentDirectory(PROJECT_ROOT, collection)
      const files = await findMarkdownFiles(contentRoot)
      const tagCounts = new Map<string, { value: string; count: number }>()

      for (const filePath of files) {
        const relativePath = relative(contentRoot, filePath)
        if (collection === 'note' && /\.en\.(?:md|mdx)$/iu.test(relativePath)) continue
        const parsed = parseFrontmatter(await readFile(filePath, 'utf8'), collection)
        entries[collection].push(deriveEntryId(relativePath, parsed?.unknown.slug))

        const fileTags = parsed?.fields.tags
        if (!Array.isArray(fileTags)) continue
        for (const value of fileTags) {
          if (typeof value !== 'string') continue
          const key = value.toLocaleLowerCase('en-US')
          const current = tagCounts.get(key)
          if (current) current.count += 1
          else tagCounts.set(key, { value, count: 1 })
        }
      }

      entries[collection].sort((left, right) => left.localeCompare(right, 'zh-CN'))
      tags[collection] = [...tagCounts.values()].sort(
        (left, right) => right.count - left.count || left.value.localeCompare(right.value, 'zh-CN')
      )
    })
  )

  return { tags, entries }
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  if (!(await pathExists(directory))) return []
  const found: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) found.push(...(await findMarkdownFiles(entryPath)))
    else if (entry.isFile() && /\.(?:md|mdx)$/iu.test(entry.name)) found.push(entryPath)
  }
  return found
}

async function readPresets(): Promise<Preset[]> {
  const parsed: unknown = JSON.parse(await readFile(PRESETS_PATH, 'utf8'))
  if (!Array.isArray(parsed)) throw new BlogToolError('presets.json 格式错误')
  return parsed.map(validatePreset)
}

function validatePreset(value: unknown): Preset {
  const input = readRecord(value, '预设')
  const name = typeof input.name === 'string' ? input.name : ''
  if (!name || name.trim() !== name || name.length > 80 || /[\u0000-\u001f]/u.test(name)) {
    throw new BlogToolError('预设名称无效')
  }
  const collection = readCollection(input.collection)
  const fields = readRecord(input.fields, '预设 fields')
  validateManagedFields(collection, fields, false)
  const enabled = Array.isArray(input.enabled) && isStringArray(input.enabled) ? input.enabled : []
  for (const name of enabled) {
    if (!fieldOf(collection, name) || fieldOf(collection, name)?.required) {
      throw new BlogToolError(`预设包含无效的可选字段：${name}`)
    }
  }
  const directoryName = readOptionalString(input.directoryName)
  if (directoryName?.includes('{{')) {
    // 占位符会在浏览器展开，保存阶段只拒绝路径分隔符。
    if (/[<>:"/\\|?*\u0000-\u001f]/u.test(directoryName)) throw new BlogToolError('预设目录名无效')
  } else if (directoryName) {
    assertSafePathSegment(directoryName, '预设目录名')
  }
  return { name, collection, enabled, fields, directoryName }
}

async function writePresets(presets: readonly Preset[]): Promise<void> {
  const temporaryPath = `${PRESETS_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(presets, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx'
  })
  try {
    await rename(temporaryPath, PRESETS_PATH)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const relativePath =
    pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '')
  const filePath = resolve(PUBLIC_DIR, relativePath)
  const relativeFile = relative(PUBLIC_DIR, filePath)
  if (!relativeFile || relativeFile === '..' || relativeFile.startsWith(`..${sep}`)) {
    return new Response('Forbidden', { status: 403 })
  }
  const staticFile = file(filePath)
  return (await staticFile.exists())
    ? new Response(staticFile)
    : new Response('Not Found', { status: 404 })
}

async function buildBrowserFrontmatter(): Promise<string> {
  const result = await build({
    entrypoints: [FRONTMATTER_ENTRY],
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'none'
  })
  if (!result.success || !result.outputs[0]) {
    const details = result.logs.map((log: { message: string }) => log.message).join('\n')
    throw new Error(`浏览器 frontmatter 渲染器构建失败：${details}`)
  }
  return result.outputs[0].text()
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  assertRequestSize(request, MAX_JSON_BYTES)
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new BlogToolError('请求体不能超过 1 MB')
  }
  try {
    return readRecord(JSON.parse(text), '请求体')
  } catch (error) {
    if (error instanceof BlogToolError) throw error
    throw new BlogToolError('请求体必须是有效 JSON')
  }
}

function assertRequestSize(request: Request, maximum: number): void {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximum) {
    throw new BlogToolError(`请求体不能超过 ${Math.floor(maximum / 1024 / 1024)} MB`)
  }
}

function parsePort(args: readonly string[]): number {
  const index = args.indexOf('--port')
  if (index === -1) return DEFAULT_PORT
  const value = Number(args[index + 1])
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('--port 必须是 1-65535 之间的整数')
  }
  return value
}

function readCollection(value: unknown): ContentCollection {
  if (typeof value !== 'string' || !ALL_COLLECTIONS.includes(value as ContentCollection)) {
    throw new BlogToolError('collection 必须是 blog、diary 或 note')
  }
  return value as ContentCollection
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new BlogToolError(`${label}必须是对象`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new BlogToolError('字段必须是字符串')
  return value
}

function readFormString(form: FormData, name: string): string | undefined {
  const value = form.get(name)
  return typeof value === 'string' && value !== '' ? value : undefined
}

function readFormInteger(form: FormData, name: string): number | undefined {
  const value = readFormString(form, name)
  if (value === undefined) return undefined
  const number = Number(value)
  if (!Number.isInteger(number)) throw new BlogToolError(`${name} 必须是整数`)
  return number
}

function readFormBoolean(form: FormData, name: string): boolean {
  return readFormString(form, name) === 'true'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === ''
}

function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u)
  if (!match) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
}

function projectRelative(path: string): string {
  return relative(PROJECT_ROOT, path).replaceAll('\\', '/')
}

function assertInsideProject(path: string): string {
  const resolvedPath = resolve(path)
  const relativePath = relative(PROJECT_ROOT, resolvedPath)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new BlogToolError('路径必须位于项目根目录内')
  }
  return resolvedPath
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status })
}

function errorResponse(error: unknown): Response {
  const message = formatError(error)
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : undefined
  const conflict = code === 'EEXIST' || /已存在|创建失败.*exist/iu.test(message)
  const notFound = code === 'ENOENT' || /找不到/u.test(message)
  const status = conflict ? 409 : notFound ? 404 : error instanceof BlogToolError ? 400 : 500
  if (status === 500) console.error(error)
  return json({ error: status === 500 ? `服务端错误：${message}` : message }, status)
}
