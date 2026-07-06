import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync('src/components/home/IntroAnimation.astro', 'utf8')

function cssRuleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escaped}[^{]*\\{([^}]+)\\}`))
  assert.ok(match, `Missing CSS rule: ${selector}`)
  return match[1]
}

test('real header stays hidden while intro is playing', () => {
  const body = cssRuleBody('html.intro-playing header-component')

  assert.match(body, /opacity:\s*0\s*(?:;|$)/)
  assert.match(body, /pointer-events:\s*none\b/)
})

test('real highlight gradient stays hidden while intro is playing', () => {
  const body = cssRuleBody('html.intro-playing #highlight-gradient')

  assert.match(body, /opacity:\s*0\s*(?:;|$)/)
})

test('one-shot .animate keyframes are neutralized during and after intro', () => {
  // fill-mode:forwards 的 .animate 动画若不被接管，会把 opacity 钉在 1、压过级联隐藏规则；
  // intro-done 常驻则防止类移除后动画重新起播闪一下。
  for (const state of ['intro-playing', 'intro-revealing', 'intro-done']) {
    const body = cssRuleBody(`html.${state} .animate`)
    assert.match(body, /animation:\s*none\b/, `html.${state} .animate must disable animation`)
  }
})

test('cascade reveal rule appears after the hide rule (same specificity, source order wins)', () => {
  const hideIdx = source.indexOf('html.intro-playing #main-container main > *')
  const revealIdx = source.indexOf('html.intro-revealing #main-container main > *')
  assert.ok(hideIdx > -1, 'Missing cascade hide rule')
  assert.ok(revealIdx > hideIdx, 'Reveal rule must come after hide rule')
})

test('finish keeps intro-revealing long enough for the staggered cascade', () => {
  // 最大错峰延迟 0.32s + 时长 0.75s ≈ 1.07s，移除定时必须 ≥ 1100ms
  const match = source.match(/root\.classList\.remove\('intro-revealing'\), (\d+)/)
  assert.ok(match, 'Missing intro-revealing removal timer')
  assert.ok(Number(match[1]) >= 1100, `Removal timer ${match[1]}ms too short for cascade`)
})
