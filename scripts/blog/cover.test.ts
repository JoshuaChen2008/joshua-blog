import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import sharp from 'sharp'

import { convertBlogCover, parseCoverArguments, upsertHeroImage } from './cover'

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

describe('convertBlogCover', () => {
  test('转换 WebP、限制宽度并更新文章 frontmatter', async () => {
    const { projectRoot, articleDirectory, markdownPath } = await createArticle()
    const inputPath = join(articleDirectory, '封面.png')
    await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: '#FFE4B5' }
    })
      .png()
      .toFile(inputPath)

    const result = await convertBlogCover({ projectRoot, inputPath, width: 1920 })

    const output = await readFile(result.outputPath)
    const metadata = await sharp(output).metadata()
    const markdown = await readFile(markdownPath, 'utf8')
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(1920)
    expect(markdown).toContain(`heroImage: { src: './封面.webp', color: '${result.color}' }`)
    expect((await stat(inputPath)).isFile()).toBeTrue()
  })

  test('支持指定颜色并删除源文件', async () => {
    const { projectRoot, articleDirectory, markdownPath } = await createArticle()
    const inputPath = join(articleDirectory, 'cover.jpg')
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#000000' }
    })
      .jpeg()
      .toFile(inputPath)

    await convertBlogCover({
      projectRoot,
      inputPath,
      outputName: 'hero',
      color: '#83d5d0',
      removeSource: true
    })

    const markdown = await readFile(markdownPath, 'utf8')
    expect(markdown).toContain("heroImage: { src: './hero.webp', color: '#83D5D0' }")
    await expect(stat(inputPath)).rejects.toThrow()
  })
})

describe('upsertHeroImage', () => {
  test('替换已有的多行 heroImage', () => {
    const markdown = `---
title: 'Example'
heroImage:
  src: './old.png'
  color: '#000000'
---
`

    expect(upsertHeroImage(markdown, 'new.webp', '#FFFFFF')).toContain(
      "heroImage: { src: './new.webp', color: '#FFFFFF' }\n---"
    )
  })
})

describe('parseCoverArguments', () => {
  test('解析封面转换参数', () => {
    expect(
      parseCoverArguments([
        'src/content/blog/demo/cover.png',
        '--quality',
        '85',
        '--width',
        '1600',
        '--force'
      ])
    ).toEqual({
      inputPath: 'src/content/blog/demo/cover.png',
      outputName: undefined,
      quality: 85,
      width: 1600,
      color: undefined,
      force: true,
      removeSource: false
    })
  })
})

async function createArticle(): Promise<{
  projectRoot: string
  articleDirectory: string
  markdownPath: string
}> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'blog-cover-'))
  temporaryDirectories.push(projectRoot)
  const articleDirectory = join(projectRoot, 'src', 'content', 'blog', 'example')
  const markdownPath = join(articleDirectory, 'example.md')
  await mkdir(articleDirectory, { recursive: true })
  await writeFile(
    markdownPath,
    `---
title: 'Example'
publishDate: 2026-07-15
description: ''
tags: []
---
`,
    'utf8'
  )
  return { projectRoot, articleDirectory, markdownPath }
}
