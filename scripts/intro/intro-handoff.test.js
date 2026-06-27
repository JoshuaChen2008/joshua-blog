import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync('src/components/home/IntroAnimation.astro', 'utf8')

function cssRuleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  assert.ok(match, `Missing CSS rule: ${selector}`)
  return match[1]
}

test('handoff keeps real header hidden while intro overlay fades out', () => {
  const body = cssRuleBody('html.intro-handoff header-component')

  assert.match(body, /opacity:\s*0\s*(?:;|$)/)
  assert.match(body, /pointer-events:\s*none\b/)
})

test('handoff keeps real highlight gradient hidden while intro gradient fades out', () => {
  const body = cssRuleBody('html.intro-handoff #highlight-gradient')

  assert.match(body, /opacity:\s*0\s*(?:;|$)/)
})
