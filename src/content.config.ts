import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

import { noteSchema, postSchema } from './content.schemas'

// Define blog collection
const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: postSchema
})

// Define diary collection (daily posts, previously the blog collection)
const diary = defineCollection({
  loader: glob({ base: './src/content/diary', pattern: '**/*.{md,mdx}' }),
  schema: postSchema
})

const note = defineCollection({
  loader: glob({ base: './src/content/note', pattern: ['**/*.{md,mdx}', '!**/*.en.{md,mdx}'] }),
  schema: noteSchema
})

// Define docs collection

export const collections = { blog, diary, note }
