import { z } from 'astro/zod'

const requiredText = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), {
    message: 'must be a single line'
  })

const absoluteHttpUrl = requiredText.refine(
  (value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  },
  { message: 'link must be an absolute HTTP(S) URL' }
)

const avatarUrl = requiredText.refine(
  (value) => {
    if (/^\/(?!\/)/.test(value)) return true

    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  },
  { message: 'avatar must be an absolute HTTP(S) URL or a root-relative public path' }
)

const ludusPointSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    size: z.number().positive().optional()
  })
  .strict()

const ludusSchema = z
  .object({
    desktop: ludusPointSchema,
    mobile: ludusPointSchema.optional(),
    rotate: z.number().optional(),
    parallaxX: z.number().optional(),
    parallaxY: z.number().optional(),
    labelSide: z.enum(['left', 'right']).optional(),
    zIndex: z.number().int().optional()
  })
  .strict()

const avatarCacheSchema = z
  .object({
    hash: requiredText,
    path: avatarUrl
  })
  .strict()

export const friendLinkSchema = z
  .object({
    name: requiredText,
    desc: requiredText,
    link: absoluteHttpUrl,
    avatar: avatarUrl,
    avatar_cache: avatarCacheSchema.optional(),
    ludus: ludusSchema.optional()
  })
  .strict()

export const friendGroupSchema = z
  .object({
    id_name: requiredText,
    desc: requiredText,
    link_list: z.array(friendLinkSchema)
  })
  .strict()

export const linksDataSchema = z
  .object({
    friends: z.array(friendGroupSchema)
  })
  .strict()

export type AvatarCache = z.infer<typeof avatarCacheSchema>
export type FriendLink = z.infer<typeof friendLinkSchema>
export type FriendGroup = z.infer<typeof friendGroupSchema>
export type LinksData = z.infer<typeof linksDataSchema>
export type LudusLayout = NonNullable<FriendLink['ludus']>

export interface ResolvedLudusLayout {
  desktop: Required<LudusLayout['desktop']>
  mobile: Required<LudusLayout['desktop']>
  rotate: number
  parallaxX: number
  parallaxY: number
  labelSide: 'left' | 'right'
  zIndex: number
}

export interface LudusFriend {
  friend: FriendLink
  layout: ResolvedLudusLayout
}

export function parseLinks(value: unknown): LinksData {
  return linksDataSchema.parse(value)
}

export function resolveLudusLayout(friend: FriendLink): ResolvedLudusLayout | undefined {
  if (!friend.ludus) return undefined

  const desktop = {
    x: friend.ludus.desktop.x,
    y: friend.ludus.desktop.y,
    size: friend.ludus.desktop.size ?? 96
  }
  const mobileSource = friend.ludus.mobile ?? friend.ludus.desktop

  return {
    desktop,
    mobile: {
      x: mobileSource.x,
      y: mobileSource.y,
      size: mobileSource.size ?? desktop.size
    },
    rotate: friend.ludus.rotate ?? 0,
    parallaxX: friend.ludus.parallaxX ?? 30,
    parallaxY: friend.ludus.parallaxY ?? 30,
    labelSide: friend.ludus.labelSide ?? (desktop.x < 50 ? 'right' : 'left'),
    zIndex: friend.ludus.zIndex ?? 1
  }
}

export function getLudusFriends(links: LinksData): LudusFriend[] {
  return links.friends.flatMap((group) =>
    group.link_list.flatMap((friend) => {
      const layout = resolveLudusLayout(friend)
      return layout ? [{ friend, layout }] : []
    })
  )
}

function formatYamlScalar(value: string) {
  const requiresQuotes =
    value.length === 0 ||
    /[\r\n]/.test(value) ||
    /^[\-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /:\s|\s#/.test(value) ||
    /\s$/.test(value)

  return requiresQuotes ? JSON.stringify(value) : value
}

export function formatFriendYaml(
  friend: Pick<FriendLink, 'name' | 'desc' | 'link' | 'avatar'>
): string {
  return `- name: ${formatYamlScalar(friend.name)}
  desc: ${formatYamlScalar(friend.desc)}
  link: ${formatYamlScalar(friend.link)}
  avatar: ${formatYamlScalar(friend.avatar)}`
}
