import { describe, expect, test } from 'bun:test'

import { upsertHeroImage } from './cover'
import { parseFrontmatter, renderDocument, renderFrontmatter } from './frontmatter'

describe('renderFrontmatter', () => {
  test('blog 使用单引号与块状 tags，并保持字段顺序', () => {
    const rendered = renderFrontmatter(
      'blog',
      {
        title: "It's a test",
        publishDate: '2026-07-27',
        updatedDate: '2026-07-27',
        description: '摘要',
        tags: ['Blog', 'TypeScript'],
        language: 'Chinese'
      },
      ['updatedDate', 'tags', 'language']
    )

    expect(rendered).toBe(`---
title: 'It''s a test'
publishDate: 2026-07-27
updatedDate: 2026-07-27
description: '摘要'
tags:
  - Blog
  - TypeScript
language: 'Chinese'
---`)
  })

  test('diary 与 blog 使用相同风格', () => {
    const rendered = renderFrontmatter(
      'diary',
      {
        title: '暑假-第二周',
        publishDate: '2026-07-27',
        description: '',
        tags: ['Diary', '日常']
      },
      ['tags']
    )

    expect(rendered).toContain("title: '暑假-第二周'")
    expect(rendered).toContain("description: ''")
    expect(rendered).toContain('tags:\n  - Diary\n  - 日常')
  })

  test('note 使用双引号与无空格内联数组', () => {
    const rendered = renderFrontmatter(
      'note',
      {
        title: 'It\'s a "test" \\ path',
        date: '2026-07-27',
        tags: ['Next.js', '全栈'],
        relatedNote: ['rag-demo', 'mysql基础'],
        type: 'note'
      },
      ['tags', 'relatedNote', 'type']
    )

    expect(rendered).toContain('title: "It\'s a \\"test\\" \\\\ path"')
    expect(rendered).toContain('tags: ["Next.js","全栈"]')
    expect(rendered).toContain('type: "note"')
    expect(rendered).toContain('relatedNote: ["rag-demo","mysql基础"]')
  })

  test('未开启的可选字段不会输出', () => {
    const rendered = renderFrontmatter(
      'blog',
      {
        title: 'Example',
        publishDate: '2026-07-27',
        description: '',
        draft: false,
        comment: true
      },
      []
    )
    expect(rendered).not.toContain('draft:')
    expect(rendered).not.toContain('comment:')
  })

  test('heroImage 与 cover.ts 的单行格式逐字符一致', () => {
    const rendered = renderFrontmatter(
      'blog',
      {
        title: 'Example',
        publishDate: '2026-07-27',
        description: '',
        heroImage: { src: './cover.webp', color: '#FFE4B5' }
      },
      ['heroImage']
    )
    const updated = upsertHeroImage(
      `---\ntitle: 'Example'\npublishDate: 2026-07-27\ndescription: ''\n---\n`,
      'cover.webp',
      '#FFE4B5'
    )
    const expectedLine = updated.split('\n').find((line) => line.startsWith('heroImage:'))
    const actualLine = rendered.split('\n').find((line) => line.startsWith('heroImage:'))
    expect(actualLine).toBe(expectedLine)
  })
})

describe('parseFrontmatter', () => {
  test('render → parse → render 幂等，并保留未知字段', () => {
    const first = renderDocument(
      'note',
      {
        title: 'RAG demo',
        description: '记录',
        date: '2026-07-27',
        tags: ['RAG', 'AI'],
        type: 'research'
      },
      ['description', 'tags', 'type'],
      '正文',
      { series: 'Agent', weather: { text: 'sunny' } }
    )
    const parsed = parseFrontmatter(first, 'note')
    expect(parsed).not.toBeNull()
    expect(parsed?.unknown).toEqual({ series: 'Agent', weather: { text: 'sunny' } })

    const second = renderDocument(
      'note',
      parsed?.fields ?? {},
      Object.keys(parsed?.fields ?? {}),
      parsed?.body ?? '',
      parsed?.unknown ?? {}
    )
    expect(second).toBe(first)
  })

  test('纯正文提取 H1、删除该行，并把摘要截断至 160 字符', () => {
    const paragraph = '字'.repeat(170)
    const parsed = parseFrontmatter(`# 暑假的第二周\n\n${paragraph}\n\n## 正文`, 'diary')

    expect(parsed?.hasFrontmatter).toBeFalse()
    expect(parsed?.fields.title).toBe('暑假的第二周')
    expect(String(parsed?.fields.description)).toHaveLength(160)
    expect(String(parsed?.fields.description).endsWith('…')).toBeTrue()
    expect(parsed?.body).not.toContain('# 暑假的第二周')
    expect(parsed?.suggested).toEqual(['title', 'description'])
  })

  test('损坏的 frontmatter 返回 null', () => {
    expect(parseFrontmatter('---\ntitle: [\n---\n正文', 'blog')).toBeNull()
  })
})
