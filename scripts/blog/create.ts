import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  assertSafePathSegment,
  BlogToolError,
  escapeYamlSingleQuoted,
  formatError,
  formatSingaporeDate,
  getBlogDirectory
} from './shared'

interface CreateBlogOptions {
  readonly projectRoot: string
  readonly directoryName: string
  readonly fileName?: string
  readonly title?: string
  readonly date?: Date
}

interface CreatedBlog {
  readonly directoryPath: string
  readonly markdownPath: string
}

interface CreateCliOptions {
  readonly directoryName: string
  readonly fileName?: string
  readonly title?: string
}

const HELP_TEXT = `用法：
  bun run blog:new -- <目录名> [--file <文件名>] [--title <文章标题>]

示例：
  bun run blog:new -- "暑假-第二周"
  bun run blog:new -- "期末月-第四周" --file Qimo4 --title "期末月的第四周"`

export async function createBlog(options: CreateBlogOptions): Promise<CreatedBlog> {
  const directoryName = assertSafePathSegment(options.directoryName, '目录名')
  const markdownFileName = normalizeMarkdownFileName(options.fileName ?? directoryName)
  const title = normalizeTitle(options.title ?? directoryName)
  const date = formatSingaporeDate(options.date)
  const blogRoot = getBlogDirectory(options.projectRoot)
  const directoryPath = resolve(blogRoot, directoryName)
  const markdownPath = resolve(directoryPath, markdownFileName)

  try {
    await mkdir(directoryPath, { recursive: false })
  } catch (error) {
    throw new BlogToolError(`文章目录创建失败：${formatError(error)}`)
  }

  try {
    await writeFile(markdownPath, renderFrontmatter(title, date), {
      encoding: 'utf8',
      flag: 'wx'
    })
  } catch (error) {
    throw new BlogToolError(`文章模板写入失败：${formatError(error)}`)
  }

  return { directoryPath, markdownPath }
}

export function parseCreateArguments(args: readonly string[]): CreateCliOptions {
  if (args.includes('--help') || args.includes('-h')) {
    throw new BlogToolError(HELP_TEXT)
  }

  const directoryName = args[0]
  if (!directoryName || directoryName.startsWith('--')) {
    throw new BlogToolError(`缺少文章目录名\n\n${HELP_TEXT}`)
  }

  let fileName: string | undefined
  let title: string | undefined

  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]
    const value = args[index + 1]

    if (argument === '--file' || argument === '--title') {
      if (!value || value.startsWith('--')) {
        throw new BlogToolError(`${argument} 缺少值`)
      }

      if (argument === '--file') {
        fileName = value
      } else {
        title = value
      }
      index += 1
      continue
    }

    throw new BlogToolError(`未知参数：${argument}\n\n${HELP_TEXT}`)
  }

  return { directoryName, fileName, title }
}

function normalizeMarkdownFileName(value: string): string {
  const safeName = assertSafePathSegment(value, 'Markdown 文件名')
  const lowerCaseName = safeName.toLowerCase()

  if (lowerCaseName.endsWith('.md') || lowerCaseName.endsWith('.mdx')) {
    return safeName
  }

  if (safeName.includes('.')) {
    throw new BlogToolError('Markdown 文件扩展名只能是 .md 或 .mdx')
  }

  return `${safeName}.md`
}

function normalizeTitle(value: string): string {
  const title = value.trim()

  if (!title) {
    throw new BlogToolError('文章标题不能为空')
  }

  if (/\r|\n/u.test(title)) {
    throw new BlogToolError('文章标题不能包含换行符')
  }

  if (title.length > 60) {
    throw new BlogToolError('文章标题不能超过 60 个字符')
  }

  return title
}

function renderFrontmatter(title: string, date: string): string {
  return `---
title: '${escapeYamlSingleQuoted(title)}'
publishDate: ${date}
updatedDate: ${date}
description: ''
tags:
  - Blog
  - 日常
language: 'Chinese'
---

`
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    if (args.includes('--help') || args.includes('-h')) {
      console.log(HELP_TEXT)
      return
    }

    const cliOptions = parseCreateArguments(args)
    const result = await createBlog({
      projectRoot: process.cwd(),
      ...cliOptions
    })
    console.log(`已创建文章目录：${result.directoryPath}`)
    console.log(`已创建文章模板：${result.markdownPath}`)
  } catch (error) {
    console.error(formatError(error))
    process.exitCode = 1
  }
}

if (import.meta.main) {
  await main()
}
