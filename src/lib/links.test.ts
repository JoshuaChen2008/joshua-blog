// @ts-expect-error Bun provides this test module at runtime; the Astro tsconfig does not load Bun globals.
import { describe, expect, test } from 'bun:test'

import { formatFriendYaml, getLudusFriends, parseLinks, resolveLudusLayout } from './links'

const validFriend = {
  name: 'Cxin Blog',
  desc: 'AI Native',
  link: 'https://cxin.vercel.app/',
  avatar: 'https://cxin.vercel.app/favicon/android-chrome-512x512.png'
}

describe('parseLinks', () => {
  test('accepts the standard friend-link format', () => {
    const result = parseLinks({
      friends: [
        {
          id_name: 'cf-links',
          desc: 'Friends',
          link_list: [validFriend]
        }
      ]
    })

    expect(result.friends[0]?.link_list[0]).toEqual(validFriend)
  })

  test('rejects legacy intro fields', () => {
    expect(() =>
      parseLinks({
        friends: [
          {
            id_name: 'cf-links',
            desc: 'Friends',
            link_list: [{ ...validFriend, desc: undefined, intro: 'Legacy description' }]
          }
        ]
      })
    ).toThrow(/intro|desc/i)
  })

  test('rejects invalid website and avatar URLs', () => {
    expect(() =>
      parseLinks({
        friends: [
          {
            id_name: 'cf-links',
            desc: 'Friends',
            link_list: [{ ...validFriend, link: 'not-a-url' }]
          }
        ]
      })
    ).toThrow(/link/i)

    expect(() =>
      parseLinks({
        friends: [
          {
            id_name: 'cf-links',
            desc: 'Friends',
            link_list: [{ ...validFriend, avatar: 'images/avatar.webp' }]
          }
        ]
      })
    ).toThrow(/avatar/i)
  })

  test('accepts root-relative public avatar paths', () => {
    const result = parseLinks({
      friends: [
        {
          id_name: 'cf-links',
          desc: 'Friends',
          link_list: [{ ...validFriend, avatar: '/images/avatar.webp' }]
        }
      ]
    })

    expect(result.friends[0]?.link_list[0]?.avatar).toBe('/images/avatar.webp')
  })
})

describe('Ludus layout', () => {
  test('fills optional layout values with defaults and infers label side', () => {
    const friend = parseLinks({
      friends: [
        {
          id_name: 'cf-links',
          desc: 'Friends',
          link_list: [
            {
              ...validFriend,
              ludus: {
                desktop: { x: 20, y: 18 }
              }
            }
          ]
        }
      ]
    }).friends[0]!.link_list[0]!

    expect(resolveLudusLayout(friend)).toEqual({
      desktop: { x: 20, y: 18, size: 96 },
      mobile: { x: 20, y: 18, size: 96 },
      rotate: 0,
      parallaxX: 30,
      parallaxY: 30,
      labelSide: 'right',
      zIndex: 1
    })
  })

  test('returns only friends with Ludus placement data', () => {
    const links = parseLinks({
      friends: [
        {
          id_name: 'cf-links',
          desc: 'Friends',
          link_list: [
            validFriend,
            {
              ...validFriend,
              name: 'Featured Friend',
              link: 'https://example.com/',
              ludus: {
                desktop: { x: 80, y: 10 },
                mobile: { x: 100, y: 40, size: 72 },
                labelSide: 'left'
              }
            }
          ]
        }
      ]
    })

    const ludusFriends = getLudusFriends(links)

    expect(ludusFriends).toHaveLength(1)
    expect(ludusFriends[0]?.friend.name).toBe('Featured Friend')
    expect(ludusFriends[0]?.layout.mobile).toEqual({ x: 100, y: 40, size: 72 })
    expect(ludusFriends[0]?.layout.labelSide).toBe('left')
  })
})

describe('formatFriendYaml', () => {
  test('outputs the exchange-friendly four-field format', () => {
    expect(formatFriendYaml(validFriend)).toBe(`- name: Cxin Blog
  desc: AI Native
  link: https://cxin.vercel.app/
  avatar: https://cxin.vercel.app/favicon/android-chrome-512x512.png`)
  })

  test('quotes values that would otherwise break YAML', () => {
    expect(formatFriendYaml({ ...validFriend, desc: 'Notes: AI # Agent' })).toContain(
      'desc: "Notes: AI # Agent"'
    )
  })
})
