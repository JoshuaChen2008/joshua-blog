import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'

import { createBlog, parseCreateArguments } from './create'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) =>
        rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      )
  )
})

describe('createBlog', () => {
  test('创建文章目录和默认 Markdown 模板', async () => {
    const projectRoot = await createProjectRoot()

    const result = await createBlog({
      projectRoot,
      directoryName: '暑假-第二周',
      date: new Date('2026-07-14T16:30:00.000Z')
    })

    const markdown = await readFile(result.markdownPath, 'utf8')
    expect(result.markdownPath).toEndWith(
      join('src', 'content', 'blog', '暑假-第二周', '暑假-第二周.md')
    )
    expect(markdown).toContain("title: '暑假-第二周'")
    expect(markdown).toContain('publishDate: 2026-07-15')
    expect(markdown).toContain('- Blog')
    expect(markdown).not.toContain('draft:')
    expect(markdown).not.toContain('heroImage:')
  })

  test('支持写入 diary 集合', async () => {
    const projectRoot = await createProjectRoot()

    const result = await createBlog({
      projectRoot,
      directoryName: '暑假-第三周',
      collection: 'diary',
      date: new Date('2026-07-14T16:30:00.000Z')
    })

    const markdown = await readFile(result.markdownPath, 'utf8')
    expect(result.markdownPath).toEndWith(
      join('src', 'content', 'diary', '暑假-第三周', '暑假-第三周.md')
    )
    expect(markdown).toContain('- Diary')
    expect(markdown).toContain('- 日常')
  })

  test('支持自定义文件名并转义标题中的单引号', async () => {
    const projectRoot = await createProjectRoot()

    const result = await createBlog({
      projectRoot,
      directoryName: 'week-four',
      fileName: 'Qimo4.mdx',
      title: "Joshua's week",
      date: new Date('2026-07-15T00:00:00.000Z')
    })

    const markdown = await readFile(result.markdownPath, 'utf8')
    expect(result.markdownPath).toEndWith(join('week-four', 'Qimo4.mdx'))
    expect(markdown).toContain("title: 'Joshua''s week'")
  })

  test('拒绝覆盖已经存在的文章目录', async () => {
    const projectRoot = await createProjectRoot()
    const options = { projectRoot, directoryName: 'same-post' }
    await createBlog(options)

    await expect(createBlog(options)).rejects.toThrow()
  })
})

describe('parseCreateArguments', () => {
  test('解析目录名、文件名和标题', () => {
    expect(
      parseCreateArguments(['期末月-第四周', '--file', 'Qimo4', '--title', '期末月的第四周'])
    ).toEqual({
      directoryName: '期末月-第四周',
      fileName: 'Qimo4',
      title: '期末月的第四周',
      collection: 'blog'
    })
  })

  test('支持 --diary 出现在目录名之前（diary:new 的调用方式）', () => {
    expect(parseCreateArguments(['--diary', '暑假-第二周'])).toEqual({
      directoryName: '暑假-第二周',
      fileName: undefined,
      title: undefined,
      collection: 'diary'
    })
  })
})

async function createProjectRoot(): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'blog-create-'))
  temporaryDirectories.push(projectRoot)
  await writeFile(join(projectRoot, 'placeholder'), '', 'utf8')
  await mkdir(join(projectRoot, 'src', 'content', 'blog'), { recursive: true })
  await mkdir(join(projectRoot, 'src', 'content', 'diary'), { recursive: true })
  return projectRoot
}
