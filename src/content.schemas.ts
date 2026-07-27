import type { SchemaContext } from 'astro:content'
import { z } from 'astro/zod'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  return Array.from(new Set(lowercaseItems))
}

export const postSchema = ({ image }: SchemaContext) =>
  z.object({
    title: z.string().max(60),
    description: z.string().max(160),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z
      .object({
        src: image(),
        alt: z.string().optional(),
        inferSize: z.boolean().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        color: z.string().optional()
      })
      .optional(),
    tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
    language: z.string().optional(),
    draft: z.boolean().default(false),
    comment: z.boolean().default(true)
  })

export const noteSchema = ({ image }: SchemaContext) =>
  z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    accentColor: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z
      .object({
        src: image(),
        alt: z.string().optional(),
        inferSize: z.boolean().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        color: z.string().optional()
      })
      .optional(),
    tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
    type: z.enum(['note', 'snippet', 'draft', 'idea', 'research', 'reference']).default('note'),
    status: z.enum(['in-progress', 'incomplete', 'ready', 'archived']).default('in-progress'),
    draft: z.boolean().default(false),
    language: z.string().optional(),
    translationKey: z.string().optional(),
    relatedBlog: z.array(z.string()).optional(),
    relatedNote: z.array(z.string()).optional(),
    source: z.string().url().optional(),
    comment: z.boolean().default(true)
  })
