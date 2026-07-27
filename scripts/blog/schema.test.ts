import { z } from 'astro/zod'
import { describe, expect, test } from 'bun:test'

import { noteSchema, postSchema } from '../../src/content.schemas'
import { fieldsOf } from './schema'
import type { ContentCollection } from './shared'

describe('FIELDS 与 Astro collection schema', () => {
  for (const collection of ['blog', 'diary', 'note'] as const) {
    test(`${collection} 字段集合完全一致`, () => {
      const schema = collection === 'note' ? noteSchema : postSchema
      const schemaKeys = Object.keys(schema({ image: () => z.string() }).shape).sort()
      const studioKeys = fieldsOf(collection as ContentCollection)
        .map((field) => field.name)
        .sort()

      if (collection === 'note') studioKeys.push('heroImage')
      expect(studioKeys.sort()).toEqual(schemaKeys)
    })
  }
})
