import { isAbsolute, relative, resolve, sep } from 'node:path'
import { slug as githubSlug } from 'github-slugger'

export const POST_COLLECTIONS = ['blog', 'diary'] as const
export const ALL_COLLECTIONS = ['blog', 'diary', 'note'] as const
export type PostCollection = (typeof POST_COLLECTIONS)[number]
export type ContentCollection = (typeof ALL_COLLECTIONS)[number]

export class BlogToolError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BlogToolError'
  }
}

export function getContentDirectory(
  projectRoot: string,
  collection: ContentCollection = 'blog'
): string {
  return resolve(projectRoot, 'src/content', collection)
}

export function assertSafePathSegment(value: string, label: string): string {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    throw new BlogToolError(`${label}不能为空`)
  }

  if (trimmedValue !== value) {
    throw new BlogToolError(`${label}不能以空格开头或结尾`)
  }

  if (/[<>:"/\\|?*\u0000-\u001f]/u.test(trimmedValue)) {
    throw new BlogToolError(`${label}包含 Windows 路径不支持的字符`)
  }

  if (/[. ]$/u.test(trimmedValue)) {
    throw new BlogToolError(`${label}不能以句点或空格结尾`)
  }

  const baseName = trimmedValue.split('.')[0]?.toUpperCase()
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u
  if (baseName && reservedNames.test(baseName)) {
    throw new BlogToolError(`${label}不能使用 Windows 保留名称：${baseName}`)
  }

  return trimmedValue
}

export function resolveArticleCollection(
  projectRoot: string,
  articleDirectory: string
): PostCollection {
  for (const collection of POST_COLLECTIONS) {
    const contentRoot = getContentDirectory(projectRoot, collection)
    const relativeDirectory = relative(contentRoot, articleDirectory)
    const segments = relativeDirectory.split(sep).filter(Boolean)

    if (
      relativeDirectory &&
      relativeDirectory !== '..' &&
      !relativeDirectory.startsWith(`..${sep}`) &&
      segments.length === 1
    ) {
      return collection
    }
  }

  throw new BlogToolError(
    '封面图片必须位于 src/content/blog 或 src/content/diary 下的一级文章目录中'
  )
}

export function assertPathInside(
  parentDirectory: string,
  candidatePath: string,
  label: string
): string {
  const resolvedParent = resolve(parentDirectory)
  const resolvedCandidate = resolve(candidatePath)
  const relativePath = relative(resolvedParent, resolvedCandidate)

  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new BlogToolError(`${label}必须位于 ${resolvedParent} 内`)
  }

  return resolvedCandidate
}

/** 与 Astro glob loader 的默认 id 生成规则保持一致。 */
export function deriveEntryId(relativeMarkdownPath: string, frontmatterSlug?: unknown): string {
  if (typeof frontmatterSlug === 'string' && frontmatterSlug) return frontmatterSlug

  const normalizedPath = relativeMarkdownPath.replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '')
  const withoutExtension = normalizedPath.replace(/\.(?:md|mdx)$/iu, '')
  const slug = withoutExtension
    .split('/')
    .filter(Boolean)
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/u, '')

  if (!slug) throw new BlogToolError('无法从 Markdown 路径生成条目 id')
  return slug
}

export function escapeYamlSingleQuoted(value: string): string {
  return value.replaceAll("'", "''")
}

export function formatSingaporeDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new BlogToolError('无法生成当前日期')
  }

  return `${year}-${month}-${day}`
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
