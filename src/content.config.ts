import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

function removeDupsAndLowerCase(array: string[]) {
  if (!array.length) return array
  const lowercaseItems = array.map((str) => str.toLowerCase())
  const distinctItems = new Set(lowercaseItems)
  return Array.from(distinctItems)
}

// Define blog collection
const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Required
  schema: ({ image }) =>
    z.object({
      // Required
      title: z.string().max(60),
      description: z.string().max(160),
      publishDate: z.coerce.date(),
      // Optional
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
      // Special fields
      comment: z.boolean().default(true)
    })
})

const note = defineCollection({
  loader: glob({ base: './src/content/note', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: ({ image }) =>
    z.object({
      // Required
      title: z.string(),
      date: z.coerce.date(),
      // Optional
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
      // Type of archive entry: note, snippet, draft, idea, research, etc.
      type: z.enum(['note', 'snippet', 'draft', 'idea', 'research', 'reference']).default('note'),
      // Status: in-progress, incomplete, ready, archived
      status: z.enum(['in-progress', 'incomplete', 'ready', 'archived']).default('in-progress'),
      draft: z.boolean().default(false),
      // For English mirrors: the Chinese entry's id (e.g. `0326-foo`). Drives en routing + hreflang.
      language: z.string().optional(),

      translationKey: z.string().optional(),
      // Relationships - connect note entries to blog posts and other notes
      relatedBlog: z.array(z.string()).optional(),
      relatedNote: z.array(z.string()).optional(),
      // External source or reference URL
      source: z.string().url().optional()
    })
})

// Define docs collection

export const collections = { blog, note }
