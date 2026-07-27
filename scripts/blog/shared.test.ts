import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'

import { assertPathInside, deriveEntryId, resolveArticleCollection } from './shared'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  )
})

describe('deriveEntryId', () => {
  const realAstroIds = [
    ['大一结束的伊始/dayi.md', '大一结束的伊始/dayi'],
    ['期末月-第二周/QimoTwo.md', '期末月-第二周/qimotwo'],
    ['期末月-第三周/Qimo3.md', '期末月-第三周/qimo3'],
    ['期末月-第一周/QimoyueDiyizhou.md', '期末月-第一周/qimoyuediyizhou'],
    ['暑假-第一周/暑假-第一周.md', '暑假-第一周/暑假-第一周'],
    ['FristBlog/index.md', 'fristblog'],
    ['打字网站笔记.md', '打字网站笔记'],
    ['全栈挑战.md', '全栈挑战'],
    ['java笔记.md', 'java笔记'],
    ['Leetcode前置知识.md', 'leetcode前置知识'],
    ['MySQL基础.md', 'mysql基础'],
    ['Mysql进阶.md', 'mysql进阶'],
    ['Pi-mono拆解/pi -mono 拆解.md', 'pi-mono拆解/pi--mono-拆解'],
    ['RAG demo.md', 'rag-demo'],
    ['SyncTalk平台搭建记录.md', 'synctalk平台搭建记录']
  ] as const

  for (const [path, id] of realAstroIds) {
    test(`${path} → ${id}`, () => expect(deriveEntryId(path)).toBe(id))
  }
})

describe('路径守卫', () => {
  test('resolveArticleCollection 仍拒绝 note 目录', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'blog-shared-'))
    temporaryDirectories.push(projectRoot)
    const directory = join(projectRoot, 'src', 'content', 'note', 'nested')
    await mkdir(directory, { recursive: true })
    expect(() => resolveArticleCollection(projectRoot, directory)).toThrow()
  })

  test('拒绝 .. 逃逸', () => {
    const root = resolve('src/content/blog')
    expect(() => assertPathInside(root, resolve(root, '..', 'note.md'), '测试路径')).toThrow()
  })
})
