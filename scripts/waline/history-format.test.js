import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatHistoricalComment,
  normalizeWalinePath,
  validateHistoricalComment
} from './history-format.js'

describe('normalizeWalinePath', () => {
  it('keeps absolute site paths stable and removes duplicate slashes', () => {
    assert.equal(normalizeWalinePath('blog//FristBlog/'), '/blog/FristBlog/')
    assert.equal(normalizeWalinePath('/note/RAG demo'), '/note/RAG%20demo')
  })

  it('normalizes full URLs to their pathname only', () => {
    assert.equal(normalizeWalinePath('https://example.com/blog/FristBlog/?from=old'), '/blog/FristBlog/')
  })
})

describe('validateHistoricalComment', () => {
  it('requires url, nick, comment, and createdAt', () => {
    const errors = validateHistoricalComment({ url: '/blog/FristBlog/', nick: '', comment: '', createdAt: '' })

    assert.deepEqual(errors, [
      'nick is required',
      'comment is required',
      'createdAt is required'
    ])
  })
})

describe('formatHistoricalComment', () => {
  it('formats a historical comment into Waline import fields', () => {
    const formatted = formatHistoricalComment({
      url: 'https://example.com/note/RAG demo',
      nick: 'Joshua',
      mail: 'joshua@example.com',
      comment: '欢迎回来',
      createdAt: '2026-06-04T10:00:00+08:00'
    })

    assert.deepEqual(formatted, {
      url: '/note/RAG%20demo',
      nick: 'Joshua',
      mail: 'joshua@example.com',
      link: '',
      comment: '欢迎回来',
      createdAt: '2026-06-04T02:00:00.000Z',
      pid: '',
      rid: '',
      at: '',
      ua: '',
      status: 'approved'
    })
  })
})
