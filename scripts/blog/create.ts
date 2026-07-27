import { mkdir, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { renderDocument } from './frontmatter'
import { COLLECTION_CONFIG, fieldsOf } from './schema'
import {
  ALL_COLLECTIONS,
  assertPathInside,
  assertSafePathSegment,
  BlogToolError,
  deriveEntryId,
  formatError,
  formatSingaporeDate,
  getContentDirectory,
  type ContentCollection
} from './shared'

export interface CreateBlogOptions {
  readonly projectRoot: string
  readonly directoryName?: string
  readonly fileName?: string
  readonly title?: string
  readonly date?: Date
  readonly collection?: ContentCollection
  readonly fields?: Readonly<Record<string, unknown>>
  readonly enabled?: Iterable<string>
  readonly unknown?: Readonly<Record<string, unknown>>
  readonly body?: string
}

export interface CreatedBlog {
  readonly directoryPath?: string
  readonly markdownPath: string
  readonly entryId: string
}

interface CreateCliOptions {
  readonly directoryName: string
  readonly fileName?: string
  readonly title?: string
  readonly collection: ContentCollection
}

const HELP_TEXT = `用法：
  bun run blog:new -- <目录名> [--file <文件名>] [--title <文章标题>] [--diary | --note]
  bun run diary:new -- <目录名> [--file <文件名>] [--title <文章标题>]
  bun run note:new -- <文件名或标题> [--file <文件名>] [--title <文章标题>]

选项：
  --diary               写入 src/content/diary（日记）
  --note                写入 src/content/note（平铺笔记）

示例：
  bun run blog:new -- "全栈开发实践"
  bun run diary:new -- "暑假-第二周"
  bun run note:new -- "Astro 内容集合"`

export async function createBlog(options: CreateBlogOptions): Promise<CreatedBlog> {
  const collection = options.collection ?? 'blog'
  if (!ALL_COLLECTIONS.includes(collection)) throw new BlogToolError(`未知集合：${collection}`)

  const date = formatSingaporeDate(options.date)
  const suppliedFields = options.fields ?? {}
  const fallbackTitle =
    options.title ?? options.directoryName ?? basenameWithoutMarkdown(options.fileName)
  const title = normalizeTitle(String(suppliedFields.title ?? fallbackTitle ?? ''), collection)
  const defaults = defaultFields(collection, title, date)
  const values = { ...defaults, ...suppliedFields, title }
  const enabled =
    options.enabled ??
    fieldsOf(collection)
      .filter((field) => field.defaultOn)
      .map((field) => field.name)
  const contentRoot = getContentDirectory(options.projectRoot, collection)
  const config = COLLECTION_CONFIG[collection]

  let directoryPath: string | undefined
  let markdownPath: string

  if (config.layout === 'directory') {
    const directoryName = assertSafePathSegment(options.directoryName ?? title, '目录名')
    const markdownFileName = normalizeMarkdownFileName(options.fileName ?? 'index.md')
    directoryPath = assertPathInside(contentRoot, resolve(contentRoot, directoryName), '文章目录')
    markdownPath = assertPathInside(
      contentRoot,
      resolve(directoryPath, markdownFileName),
      'Markdown 路径'
    )

    try {
      await mkdir(directoryPath, { recursive: false })
    } catch (error) {
      throw new BlogToolError(`文章目录创建失败：${formatError(error)}`)
    }
  } else {
    const fileBase = options.fileName ?? options.directoryName ?? title
    const markdownFileName = normalizeMarkdownFileName(fileBase)
    markdownPath = assertPathInside(
      contentRoot,
      resolve(contentRoot, markdownFileName),
      'Markdown 路径'
    )
  }

  try {
    await writeFile(
      markdownPath,
      renderDocument(collection, values, enabled, options.body ?? '', options.unknown),
      { encoding: 'utf8', flag: 'wx' }
    )
  } catch (error) {
    throw new BlogToolError(`文章模板写入失败：${formatError(error)}`)
  }

  const relativeMarkdownPath = relative(contentRoot, markdownPath)
  return {
    directoryPath,
    markdownPath,
    entryId: deriveEntryId(relativeMarkdownPath, options.unknown?.slug)
  }
}

export function parseCreateArguments(args: readonly string[]): CreateCliOptions {
  if (args.includes('--help') || args.includes('-h')) throw new BlogToolError(HELP_TEXT)

  let directoryName: string | undefined
  let fileName: string | undefined
  let title: string | undefined
  let collection: ContentCollection = 'blog'

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--diary' || argument === '--note') {
      collection = argument === '--diary' ? 'diary' : 'note'
      continue
    }

    if (argument === '--file' || argument === '--title') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) throw new BlogToolError(`${argument} 缺少值`)
      if (argument === '--file') fileName = value
      else title = value
      index += 1
      continue
    }

    if (argument?.startsWith('--')) {
      throw new BlogToolError(`未知参数：${argument}\n\n${HELP_TEXT}`)
    }
    if (directoryName !== undefined) {
      throw new BlogToolError(`多余的位置参数：${argument}\n\n${HELP_TEXT}`)
    }
    directoryName = argument
  }

  if (!directoryName) throw new BlogToolError(`缺少文章目录名或文件名\n\n${HELP_TEXT}`)
  return { directoryName, fileName, title, collection }
}

export function normalizeMarkdownFileName(value: string): string {
  const safeName = assertSafePathSegment(value, 'Markdown 文件名')
  const lowerCaseName = safeName.toLowerCase()

  if (lowerCaseName.endsWith('.md') || lowerCaseName.endsWith('.mdx')) return safeName
  if (safeName.includes('.')) throw new BlogToolError('Markdown 文件扩展名只能是 .md 或 .mdx')
  return `${safeName}.md`
}

function normalizeTitle(value: string, collection: ContentCollection): string {
  const title = value.trim()
  if (!title) throw new BlogToolError('文章标题不能为空')
  if (/\r|\n/u.test(title)) throw new BlogToolError('文章标题不能包含换行符')
  if (collection !== 'note' && title.length > 60) {
    throw new BlogToolError('文章标题不能超过 60 个字符')
  }
  return title
}

function defaultFields(
  collection: ContentCollection,
  title: string,
  date: string
): Record<string, unknown> {
  if (collection === 'note') {
    return {
      title,
      description: '',
      date,
      tags: [],
      type: 'note',
      status: 'in-progress',
      draft: false,
      comment: true
    }
  }

  return {
    title,
    publishDate: date,
    updatedDate: date,
    description: '',
    tags: collection === 'diary' ? ['Diary', '日常'] : ['Blog'],
    language: 'Chinese',
    draft: false,
    comment: true
  }
}

function basenameWithoutMarkdown(fileName: string | undefined): string | undefined {
  return fileName?.replace(/\.(?:md|mdx)$/iu, '')
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    if (args.includes('--help') || args.includes('-h')) {
      console.log(HELP_TEXT)
      return
    }

    const result = await createBlog({ projectRoot: process.cwd(), ...parseCreateArguments(args) })
    if (result.directoryPath) console.log(`已创建文章目录：${result.directoryPath}`)
    console.log(`已创建文章模板：${result.markdownPath}`)
    console.log(`条目 id：${result.entryId}`)
  } catch (error) {
    console.error(formatError(error))
    process.exitCode = 1
  }
}

if (import.meta.main) await main()
