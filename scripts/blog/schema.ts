import type { ContentCollection } from './shared'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'tags'
  | 'color'
  | 'url'
  | 'entryRef'
  | 'heroImage'

export interface FieldDescriptor {
  readonly name: string
  readonly label: string
  readonly type: FieldType
  readonly collections: readonly ContentCollection[]
  readonly required: boolean
  readonly default?: unknown
  readonly defaultOn?: boolean
  readonly maxLength?: number
  readonly softMax?: number
  readonly options?: readonly string[]
  readonly refCollection?: ContentCollection
  readonly readonly?: boolean
  readonly hint?: string
}

const POST_COLLECTIONS = ['blog', 'diary'] as const

export const COLLECTION_CONFIG = {
  blog: {
    label: 'Blog',
    layout: 'directory',
    dateField: 'publishDate',
    style: { quote: "'", tags: 'block' },
    cover: true
  },
  diary: {
    label: 'Diary',
    layout: 'directory',
    dateField: 'publishDate',
    style: { quote: "'", tags: 'block' },
    cover: true
  },
  note: {
    label: 'Note',
    layout: 'flat',
    dateField: 'date',
    style: { quote: '"', tags: 'inline' },
    cover: false
  }
} as const satisfies Record<ContentCollection, unknown>

/** 字段顺序就是最终 frontmatter 的输出顺序。 */
export const FIELDS: readonly FieldDescriptor[] = [
  {
    name: 'title',
    label: '标题',
    type: 'text',
    collections: POST_COLLECTIONS,
    required: true,
    maxLength: 60
  },
  {
    name: 'publishDate',
    label: '发布日期',
    type: 'date',
    collections: POST_COLLECTIONS,
    required: true
  },
  {
    name: 'updatedDate',
    label: '更新日期',
    type: 'date',
    collections: POST_COLLECTIONS,
    required: false,
    defaultOn: true
  },
  {
    name: 'description',
    label: '摘要',
    type: 'textarea',
    collections: POST_COLLECTIONS,
    required: true,
    default: '',
    maxLength: 160,
    hint: '空值可通过校验，但不利于 SEO'
  },
  {
    name: 'tags',
    label: '标签',
    type: 'tags',
    collections: POST_COLLECTIONS,
    required: false,
    default: [],
    defaultOn: true
  },
  {
    name: 'language',
    label: '语言',
    type: 'text',
    collections: POST_COLLECTIONS,
    required: false,
    default: 'Chinese',
    defaultOn: true
  },
  {
    name: 'heroImage',
    label: '封面',
    type: 'heroImage',
    collections: POST_COLLECTIONS,
    required: false,
    readonly: true,
    hint: '由下方封面流程写入'
  },
  {
    name: 'draft',
    label: '草稿',
    type: 'boolean',
    collections: POST_COLLECTIONS,
    required: false,
    default: false
  },
  {
    name: 'comment',
    label: '评论',
    type: 'boolean',
    collections: POST_COLLECTIONS,
    required: false,
    default: true
  },

  {
    name: 'title',
    label: '标题',
    type: 'text',
    collections: ['note'],
    required: true,
    softMax: 60
  },
  {
    name: 'description',
    label: '摘要',
    type: 'textarea',
    collections: ['note'],
    required: false,
    defaultOn: true,
    softMax: 160
  },
  {
    name: 'date',
    label: '日期',
    type: 'date',
    collections: ['note'],
    required: true
  },
  {
    name: 'updatedDate',
    label: '更新日期',
    type: 'date',
    collections: ['note'],
    required: false
  },
  {
    name: 'accentColor',
    label: '主题色',
    type: 'color',
    collections: ['note'],
    required: false,
    hint: '#RRGGBB'
  },
  {
    name: 'tags',
    label: '标签',
    type: 'tags',
    collections: ['note'],
    required: false,
    default: [],
    defaultOn: true
  },
  {
    name: 'type',
    label: '类型',
    type: 'enum',
    collections: ['note'],
    required: false,
    default: 'note',
    defaultOn: true,
    options: ['note', 'snippet', 'draft', 'idea', 'research', 'reference']
  },
  {
    name: 'status',
    label: '状态',
    type: 'enum',
    collections: ['note'],
    required: false,
    default: 'in-progress',
    defaultOn: true,
    options: ['in-progress', 'incomplete', 'ready', 'archived']
  },
  {
    name: 'draft',
    label: '草稿',
    type: 'boolean',
    collections: ['note'],
    required: false,
    default: false,
    defaultOn: true
  },
  {
    name: 'language',
    label: '语言',
    type: 'text',
    collections: ['note'],
    required: false
  },
  {
    name: 'translationKey',
    label: '翻译键',
    type: 'text',
    collections: ['note'],
    required: false
  },
  {
    name: 'relatedBlog',
    label: '关联文章',
    type: 'entryRef',
    collections: ['note'],
    required: false,
    refCollection: 'blog'
  },
  {
    name: 'relatedNote',
    label: '关联笔记',
    type: 'entryRef',
    collections: ['note'],
    required: false,
    refCollection: 'note'
  },
  {
    name: 'source',
    label: '来源链接',
    type: 'url',
    collections: ['note'],
    required: false
  },
  {
    name: 'comment',
    label: '评论',
    type: 'boolean',
    collections: ['note'],
    required: false,
    default: true
  }
]

export function fieldsOf(collection: ContentCollection): readonly FieldDescriptor[] {
  return FIELDS.filter((field) => field.collections.includes(collection))
}

export function fieldOf(collection: ContentCollection, name: string): FieldDescriptor | undefined {
  return fieldsOf(collection).find((field) => field.name === name)
}
