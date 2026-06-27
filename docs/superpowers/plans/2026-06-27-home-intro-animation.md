# 首页入场动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在博客首页 `/` 增加一段开屏入场动画——中央药丸条 + 玻璃光晕，停留后沿直线上移并展开变形为顶部导航栏（到顶单次水滴回弹），光晕舒展成背景渐变，首页内容由下而上渐显；每会话播放一次，并配一个临时回放按钮。

**Architecture:** 全屏 `position:fixed` 遮罩组件 `IntroAnimation.astro`（纯视觉，不动第三方 `Header`），用原生 CSS transition/keyframes + 一段内联 JS 编排时间线。`<head>` 内联脚本在首屏绘制前根据 `sessionStorage` + `prefers-reduced-motion` 决定是否给 `<html>` 加 `intro-playing` 类（防闪烁）。动画结束移除该类，真实页面（含真实 `Header`）显现。临时回放按钮 `IntroReplayButton.astro` 独立组件，调用约定接口 `window.__replayIntro()`。

**Tech Stack:** Astro 6 + astro-pure 主题（UnoCSS 风格 class、HSL CSS 变量 `--background`/`--foreground`/`--border`/`--muted-foreground`）、Bun、原生 CSS/JS，无新增依赖。

## Global Constraints

- 包管理器：`bun`（脚本用 `bun astro ...`）。
- 不修改 `node_modules/`（尤其 `astro-pure` 的 `Header.astro`）。
- 不引入任何动画库/新依赖。
- 主题色统一 `#659EB9`（与 `src/pages/index.astro` 的 `highlightColor` 一致）；颜色尽量用 HSL 变量以适配深色模式。
- 仅首页 `/` 触发；每浏览器会话播放一次（`sessionStorage` key：`introPlayed`，值 `'1'`）。
- `prefers-reduced-motion: reduce` 用户跳过动画。
- 类型/语法校验命令：`bun astro check`，期望 0 error。
- 回放按钮为临时开发件，文件头注释标注 TEMP / 删除方式。

---

## File Structure

- 修改 `src/layouts/BaseLayout.astro`：在 `<head>` 加一段 `is:inline` 防闪烁门控脚本（仅在 `/` 且应播放时给 `<html>` 加 `intro-playing`）。
- 新建 `src/components/home/IntroAnimation.astro`：遮罩 + 光晕 + 标题 + 药丸的标记、scoped 样式、全局隐藏/显现样式、时间线脚本、回放接口、跳过逻辑。
- 新建 `src/components/home/IntroReplayButton.astro`：临时左下角回放按钮（独立、可一键删除）。
- 修改 `src/pages/index.astro`：引入并渲染上述两个组件。

---

### Task 1: 防闪烁门控 + 遮罩静态布局

**Files:**
- Modify: `src/layouts/BaseLayout.astro`（在 `<head>` 内 `ThemeProvider` 之后插入门控脚本）
- Create: `src/components/home/IntroAnimation.astro`
- Modify: `src/pages/index.astro`（引入并渲染 `IntroAnimation`）

**Interfaces:**
- Consumes: `<html>` 上的 `intro-playing` 类（由门控脚本设置）；HSL 变量 `--background`/`--foreground`/`--border`/`--muted-foreground`；主容器 `#main-container`、自定义元素 `header-component`、首页 `<main>`。
- Produces: 全局类约定 `html.intro-playing`（隐藏首页内容与导航栏）与 `html.intro-revealing`（内容由下而上显现）；遮罩 DOM 节点 id：`intro-overlay`/`intro-bg`/`intro-glow`/`intro-title`/`intro-pill`/`intro-brand`/`intro-welcome`/`intro-menu`。

- [ ] **Step 1: 在 `BaseLayout.astro` 的 `<head>` 加门控脚本**

在 `src/layouts/BaseLayout.astro` 中，将
```astro
    <ThemeProvider />
  </head>
```
改为
```astro
    <ThemeProvider />
    <script is:inline>
      ;(function () {
        try {
          if (location.pathname !== '/') return
          var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          var played = sessionStorage.getItem('introPlayed') === '1'
          if (!rm && !played) document.documentElement.classList.add('intro-playing')
        } catch (e) {}
      })()
    </script>
  </head>
```

- [ ] **Step 2: 创建 `IntroAnimation.astro`（标记 + 样式，本任务暂不含时间线脚本）**

新建 `src/components/home/IntroAnimation.astro`：
```astro
---
// 首页开屏入场动画（纯视觉遮罩，不依赖第三方 Header）。
---
<div id='intro-overlay' aria-hidden='true'>
  <div id='intro-bg'></div>
  <div class='intro-inner'>
    <div id='intro-glow'></div>
    <div id='intro-title'>Joshua's Blog</div>
    <div id='intro-pill'>
      <span id='intro-brand'>Joshua's Blog</span>
      <span id='intro-welcome'>Welcome to explore my blog.</span>
      <span id='intro-menu'>About&nbsp;&nbsp;Blog</span>
    </div>
  </div>
</div>

<style>
  #intro-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
  }
  #intro-bg {
    position: absolute;
    inset: 0;
    background: hsl(var(--background));
    transition: opacity 0.9s ease;
  }
  .intro-inner {
    position: relative;
    height: 100%;
    max-width: 70rem;
    margin-inline: auto;
    padding-inline: 1rem;
  }
  @media (min-width: 640px) {
    .intro-inner {
      padding-inline: 1.75rem;
    }
  }
  @media (min-width: 1024px) {
    .intro-inner {
      padding-inline: 2.5rem;
    }
  }
  #intro-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(90vw, 640px);
    height: 42vh;
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0;
    border-radius: 50%;
    filter: blur(34px);
    background: radial-gradient(
      ellipse at center,
      rgba(101, 158, 185, 0.92),
      rgba(101, 158, 185, 0.3) 45%,
      rgba(101, 158, 185, 0) 70%
    );
    transition:
      top 1.15s ease,
      width 1.15s ease,
      height 1.15s ease,
      transform 1.15s ease,
      opacity 1.15s ease,
      filter 1.15s ease;
  }
  #intro-title {
    position: absolute;
    left: 50%;
    top: calc(50% - 64px);
    transform: translateX(-50%);
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: hsl(var(--foreground));
    white-space: nowrap;
    opacity: 0;
    transition:
      opacity 0.45s ease,
      top 0.42s cubic-bezier(0.4, 0, 0.2, 1);
  }
  #intro-pill {
    position: absolute;
    left: 50%;
    top: calc(50% - 27px);
    width: min(86vw, 320px);
    height: 54px;
    transform: translateX(-50%) scale(0.94);
    opacity: 0;
    transform-origin: center;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
    border-radius: 1rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    box-shadow:
      rgba(24, 24, 27, 0.08) 0 0 0 1px,
      rgba(39, 39, 42, 0.08) 0 10px 15px -3px,
      rgba(39, 39, 42, 0.08) 0 4px 6px -4px;
    transition:
      opacity 0.5s ease,
      transform 0.8s cubic-bezier(0.45, 0.05, 0.2, 1);
  }
  #intro-brand {
    position: absolute;
    left: 0.75rem;
    font-size: 1.25rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  #intro-welcome {
    font-size: 1rem;
    font-weight: 500;
    color: hsl(var(--foreground));
    white-space: nowrap;
    transition: opacity 0.22s ease;
  }
  #intro-menu {
    position: absolute;
    right: 0.75rem;
    font-size: 0.95rem;
    color: hsl(var(--muted-foreground));
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  @keyframes introNavJelly {
    0% {
      transform: translateX(-50%) scale(1, 1);
    }
    35% {
      transform: translateX(-50%) scale(1.02, 0.83);
    }
    70% {
      transform: translateX(-50%) scale(0.99, 1.06);
    }
    100% {
      transform: translateX(-50%) scale(1, 1);
    }
  }
</style>

<style is:global>
  html.intro-playing {
    overflow: hidden;
  }
  html.intro-playing header-component {
    opacity: 0;
    pointer-events: none;
  }
  html.intro-playing main,
  html.intro-playing #main-container > :last-child {
    opacity: 0;
    transform: translateY(2rem);
  }
  html.intro-revealing main,
  html.intro-revealing #main-container > :last-child {
    opacity: 1;
    transform: none;
    transition:
      opacity 0.8s ease,
      transform 0.8s ease;
  }
</style>
```

- [ ] **Step 3: 在 `index.astro` 引入并渲染 `IntroAnimation`**

在 `src/pages/index.astro` 顶部 frontmatter 的 import 区加入：
```astro
import IntroAnimation from '@/components/home/IntroAnimation.astro'
```
并在模板中 `<PageLayout ...>` 的开标签后、`<main ...>` 之前插入：
```astro
<PageLayout meta={{ title: 'Home' }} highlightColor='#659EB9'>
  <IntroAnimation />
  <main class='flex w-full flex-col items-center'>
```

- [ ] **Step 4: 类型/语法校验**

Run: `bun astro check`
Expected: 0 error（允许既有 warning）。

- [ ] **Step 5: 视觉验证（静态布局）**

Run: `bun dev`，浏览器打开 `http://localhost:4321/`（端口以终端输出为准）。
Expected：
- 首次进入：页面中央出现药丸条（含 `Welcome to explore my blog.`）、上方 `Joshua's Blog` 标题、背后蓝色光晕；首页正文与顶部导航被隐藏。（此时还没有动画时间线，元素处于初始 `opacity:0` 也可能整体不可见——只要 `<html>` 带 `intro-playing` 类、且无报错即可，下个任务加时间线后即可见。）
- 在同一标签页刷新（同会话）：不再隐藏，显示正常首页（因 `sessionStorage` 仍未写入，本任务尚不会写入——所以本步主要确认门控类是否按 `pathname` 生效、深色模式变量取色正常、无布局报错）。

用浏览器开发者工具确认：首次加载时 `document.documentElement.classList` 含 `intro-playing`；访问任意非 `/` 路由时不含。

- [ ] **Step 6: 提交**

```bash
git add src/layouts/BaseLayout.astro src/components/home/IntroAnimation.astro src/pages/index.astro
git commit -m "feat(intro): scaffold home intro overlay + anti-flash gate"
```

---

### Task 2: 动画时间线 + 跳过 + 回放接口

**Files:**
- Modify: `src/components/home/IntroAnimation.astro`（在文件末尾追加 `<script>` 模块）

**Interfaces:**
- Consumes: Task 1 产出的 DOM id 与全局类 `intro-playing`/`intro-revealing`。
- Produces: 全局函数 `window.__replayIntro()` 与自定义事件 `intro:replay`（供 Task 3 的回放按钮调用）；动画结束时写入 `sessionStorage.introPlayed = '1'`。

- [ ] **Step 1: 追加时间线脚本**

在 `src/components/home/IntroAnimation.astro` 末尾（最后一个 `</style>` 之后）追加：
```astro
<script>
  const root = document.documentElement
  const overlay = document.getElementById('intro-overlay') as HTMLElement
  const bg = document.getElementById('intro-bg') as HTMLElement
  const glow = document.getElementById('intro-glow') as HTMLElement
  const title = document.getElementById('intro-title') as HTMLElement
  const pill = document.getElementById('intro-pill') as HTMLElement
  const brand = document.getElementById('intro-brand') as HTMLElement
  const welcome = document.getElementById('intro-welcome') as HTMLElement
  const menu = document.getElementById('intro-menu') as HTMLElement

  const SESSION_KEY = 'introPlayed'
  const SKIP_EVENTS = ['wheel', 'keydown', 'click', 'touchstart']
  let timers: number[] = []
  let running = false

  const add = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
  const clearAll = () => {
    timers.forEach((t) => clearTimeout(t))
    timers = []
  }

  function onSkip() {
    if (running) finish()
  }
  function addSkip() {
    SKIP_EVENTS.forEach((ev) => window.addEventListener(ev, onSkip, { passive: true }))
  }
  function removeSkip() {
    SKIP_EVENTS.forEach((ev) => window.removeEventListener(ev, onSkip))
  }

  function resetVisual() {
    clearAll()
    pill.style.animation = 'none'
    pill.style.transition = 'opacity .5s ease, transform .8s cubic-bezier(.45,.05,.2,1)'
    overlay.style.display = 'block'
    overlay.style.transition = ''
    overlay.style.opacity = '1'
    bg.style.opacity = '1'
    root.classList.remove('intro-revealing')
    root.classList.add('intro-playing')
    glow.style.opacity = '0'
    glow.style.top = '50%'
    glow.style.width = 'min(90vw,640px)'
    glow.style.height = '42vh'
    glow.style.transform = 'translate(-50%,-50%) scale(.6)'
    glow.style.filter = 'blur(34px)'
    title.style.opacity = '0'
    title.style.top = 'calc(50% - 64px)'
    pill.style.opacity = '0'
    pill.style.top = 'calc(50% - 27px)'
    pill.style.width = 'min(86vw,320px)'
    pill.style.height = '54px'
    pill.style.transform = 'translateX(-50%) scale(.94)'
    pill.style.borderRadius = '1rem'
    pill.style.padding = '0 24px'
    welcome.style.opacity = '1'
    brand.style.opacity = '0'
    menu.style.opacity = '0'
  }

  function finish() {
    running = false
    clearAll()
    removeSkip()
    root.classList.remove('intro-playing', 'intro-revealing')
    overlay.style.transition = 'opacity .18s ease'
    overlay.style.opacity = '0'
    window.setTimeout(() => {
      overlay.style.display = 'none'
    }, 220)
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch (e) {}
  }

  function play() {
    running = true
    resetVisual()
    addSkip()
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        glow.style.opacity = '1'
        glow.style.transform = 'translate(-50%,-50%) scale(1)'
        title.style.opacity = '1'
        pill.style.opacity = '1'
        pill.style.transform = 'translateX(-50%) scale(1)'

        add(700, () => {
          glow.style.transform = 'translate(-50%,-50%) scale(1.05)'
        })

        add(1650, () => {
          pill.style.transition =
            'top .42s cubic-bezier(.33,0,.25,1), width .42s cubic-bezier(.33,0,.25,1), height .42s ease, border-radius .42s ease, padding .42s ease'
          welcome.style.opacity = '0'
          title.style.opacity = '0'
          title.style.top = 'calc(50% - 96px)'
          pill.style.top = '1rem'
          pill.style.width = '100%'
          pill.style.height = '3rem'
          pill.style.borderRadius = '.75rem'
          pill.style.padding = '0 .5rem'
          glow.style.top = '0'
          glow.style.height = '46vh'
          glow.style.width = '150%'
          glow.style.transform = 'translate(-50%,-46%) scale(1)'
          glow.style.filter = 'blur(44px)'
          glow.style.opacity = '0'
          bg.style.opacity = '0'
          root.classList.add('intro-revealing')
        })

        add(1650 + 230, () => {
          brand.style.opacity = '1'
          menu.style.opacity = '1'
        })

        add(1650 + 390, () => {
          void pill.offsetWidth
          pill.style.animation = 'introNavJelly .4s cubic-bezier(.3,.6,.3,1)'
        })

        add(1650 + 390 + 440, () => {
          pill.style.animation = 'none'
          pill.style.transform = 'translateX(-50%) scale(1)'
          finish()
        })
      })
    )
  }

  ;(window as any).__replayIntro = function () {
    running = false
    clearAll()
    removeSkip()
    play()
  }
  window.addEventListener('intro:replay', () => (window as any).__replayIntro())

  if (root.classList.contains('intro-playing')) play()
</script>
```

- [ ] **Step 2: 类型/语法校验**

Run: `bun astro check`
Expected: 0 error。

- [ ] **Step 3: 视觉验证（完整动画）**

Run: `bun dev`，新开一个标签页打开 `http://localhost:4321/`（确保是新会话；或在开发者工具 Application → Session Storage 删除 `introPlayed` 后刷新）。
Expected（约 2.5s）：
1. 标题 + 药丸 + 光晕一起淡入；
2. 停留约 1s；
3. 药丸沿竖直直线上移、左右对称展开为顶部长条，欢迎文字淡出、品牌+菜单淡入，标题淡出上移，光晕向上铺宽淡出、背景蓝色渐变接管，首页正文由下而上渐显；
4. 到顶瞬间单次水滴回弹；
5. 遮罩淡出，显示正常首页（含真实导航栏）。
- 期间点击/滚动/按键应立即跳过并进入正常页面。
- 在控制台执行 `window.__replayIntro()` 应重新完整播放一遍。
- 验证药丸展开末态与真实导航栏的水平位置大致对齐（品牌在左、菜单在右）；若偏差明显，微调 `#intro-brand`/`#intro-menu` 的 `left`/`right` 值与药丸展开 `padding`。

- [ ] **Step 4: 提交**

```bash
git add src/components/home/IntroAnimation.astro
git commit -m "feat(intro): add intro timeline, skip and replay API"
```

---

### Task 3: 临时回放按钮（独立可删）

**Files:**
- Create: `src/components/home/IntroReplayButton.astro`
- Modify: `src/pages/index.astro`（引入并渲染按钮）

**Interfaces:**
- Consumes: Task 2 产出的 `window.__replayIntro()` / `intro:replay` 事件。
- Produces: 无（仅 UI）。

- [ ] **Step 1: 创建回放按钮组件**

新建 `src/components/home/IntroReplayButton.astro`：
```astro
---
// TEMP（开发用）：左下角回放开屏动画按钮。
// 删除方式：删掉本文件，并移除 index.astro 中对应的 import 与 <IntroReplayButton /> 即可，零残留。
---
<button id='intro-replay-btn' type='button' aria-label='回放开屏动画'>↻ 回放开屏</button>

<style>
  #intro-replay-btn {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    z-index: 120;
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    border-radius: 0.6rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    opacity: 0.85;
    transition: opacity 0.2s ease;
  }
  #intro-replay-btn:hover {
    opacity: 1;
  }
</style>

<script>
  document.getElementById('intro-replay-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    const w = window as any
    if (typeof w.__replayIntro === 'function') w.__replayIntro()
    else window.dispatchEvent(new CustomEvent('intro:replay'))
  })
</script>
```

- [ ] **Step 2: 在 `index.astro` 引入并渲染按钮**

在 `src/pages/index.astro` 的 import 区加入：
```astro
import IntroReplayButton from '@/components/home/IntroReplayButton.astro'
```
并在模板中紧跟 `<IntroAnimation />` 之后插入：
```astro
  <IntroAnimation />
  <IntroReplayButton />
```

- [ ] **Step 3: 类型/语法校验**

Run: `bun astro check`
Expected: 0 error。

- [ ] **Step 4: 视觉验证（回放按钮）**

Run: `bun dev`，打开 `http://localhost:4321/`。
Expected：左下角出现"↻ 回放开屏"按钮；点击它无需刷新即可重新完整播放开屏动画；点击按钮本身不会被"点击跳过"逻辑误触发（即点一下是重播，不是直接跳过）。

- [ ] **Step 5: 提交**

```bash
git add src/components/home/IntroReplayButton.astro src/pages/index.astro
git commit -m "feat(intro): add temporary dev replay button"
```

---

### Task 4: 跨模式校验与收尾

**Files:**
- 无新增（仅验证，必要时微调既有文件）

**Interfaces:**
- Consumes: 前三个任务的全部产出。

- [ ] **Step 1: 深色模式验证**

`bun dev` 打开首页，切换深色模式（导航栏的主题切换按钮），清掉 `sessionStorage.introPlayed` 后重播：药丸/标题/文字用 `--foreground`/`--background`/`--border` 取色，深色下应清晰可读；光晕蓝色与背景渐变协调。若深色下光晕过亮/过暗，可微调 `#intro-glow` 的 `rgba(101,158,185,*)` 透明度。

- [ ] **Step 2: 无障碍验证**

在开发者工具的 Rendering 面板里启用 `prefers-reduced-motion: reduce`，新会话打开首页：应**直接显示正常首页、不播放动画**（`<html>` 不带 `intro-playing`）。

- [ ] **Step 3: 会话频率验证**

新会话首页 → 播放一次；同会话刷新或从其它页面返回首页 → 不再自动播放（但回放按钮仍可手动触发）。

- [ ] **Step 4: 全量校验**

Run: `bun astro check`
Expected: 0 error。
Run: `bun lint`
Expected: 通过（自动修复后无遗留 error）。

- [ ] **Step 5: 提交（如有微调）**

```bash
git add -A
git commit -m "chore(intro): cross-mode polish for dark mode and reduced-motion"
```

---

## 删除临时回放按钮（上线前）

1. 删除文件 `src/components/home/IntroReplayButton.astro`。
2. 在 `src/pages/index.astro` 移除 `import IntroReplayButton ...` 与 `<IntroReplayButton />`。
3. `bun astro check` 确认无残留引用。

入场动画本体（`IntroAnimation.astro` + 门控脚本）不受影响。

---

## Self-Review

- **Spec coverage：**
  - 触发/每会话一次 → Task 1 门控脚本 + Task 2 写 `sessionStorage`；频率验证 Task 4 Step 3。✓
  - 药丸/光晕/上下标题/欢迎文字 → Task 1 标记与样式。✓
  - 直线上移 + 对称展开变形 → Task 2 时间线（`left:50%` 固定、仅动 `top`/`width`）。✓
  - 单次水滴回弹 → `introNavJelly` 关键帧 + Task 2 触发时机。✓
  - 光晕舒展成背景渐变 → Task 2 光晕铺宽淡出 + `#intro-bg` 蓝色渐变同步（注：背景渐变由遮罩内 `#intro-bg`/光晕承担，过渡后真实页面背景接续）。✓
  - 内容由下而上渐显 → `html.intro-revealing main{...}` 过渡。✓
  - 与真实导航栏交接 → 遮罩末态对齐 + 收尾淡出移除（Task 2 Step 3 校验对齐）。✓
  - 防闪烁/无障碍/跳过/深色 → Task 1 门控、Task 2 跳过、Task 4 深色与 reduced-motion。✓
  - 临时回放按钮（独立可删）→ Task 3 + 删除指引。✓
- **Placeholder scan：** 各步均含完整代码与确切命令，无 TBD/TODO。✓
- **Type consistency：** DOM id（`intro-overlay`/`intro-bg`/`intro-glow`/`intro-title`/`intro-pill`/`intro-brand`/`intro-welcome`/`intro-menu`）、全局类（`intro-playing`/`intro-revealing`）、接口（`window.__replayIntro` / `intro:replay` / `sessionStorage.introPlayed`）在各任务间一致。✓
