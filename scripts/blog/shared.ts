import { relative, resolve, sep } from 'node:path'

export const BLOG_RELATIVE_DIRECTORY = 'src/content/blog'

export class BlogToolError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BlogToolError'
  }
}

export function getBlogDirectory(projectRoot: string): string {
  return resolve(projectRoot, BLOG_RELATIVE_DIRECTORY)
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

export function assertDirectBlogDirectory(blogRoot: string, directory: string): void {
  const relativeDirectory = relative(blogRoot, directory)
  const segments = relativeDirectory.split(sep).filter(Boolean)

  if (
    !relativeDirectory ||
    relativeDirectory === '..' ||
    relativeDirectory.startsWith(`..${sep}`) ||
    segments.length !== 1
  ) {
    throw new BlogToolError('封面图片必须位于 src/content/blog 下的一级文章目录中')
  }
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
