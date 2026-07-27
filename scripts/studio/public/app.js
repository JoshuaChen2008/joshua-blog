import {
  COLLECTION_CONFIG,
  fieldOf,
  fieldsOf,
  parseFrontmatter,
  renderDocument,
  renderFrontmatter
} from '/app/frontmatter.js'

const POST_COLLECTIONS = ['blog', 'diary']
const el = (id) => document.getElementById(id)

let meta
try {
  meta = await api('/api/meta')
} catch (error) {
  document.body.innerHTML = `<main class="fatal"><h1>Blog Studio 启动失败</h1><p></p></main>`
  document.querySelector('.fatal p').textContent = error.message
  throw error
}

const state = {
  collection: 'blog',
  directoryName: '',
  fileName: '',
  enabled: new Set(),
  values: {},
  suggested: new Set(),
  unknown: {},
  bodyMode: 'empty',
  body: '',
  cover: null,
  pathCheck: { path: '', exists: false, pending: true, error: '' },
  creating: false,
  result: null
}

let pathTimer
let pathSequence = 0
let importTimer

function resetForCollection(collection) {
  state.collection = collection
  state.enabled = new Set()
  state.values = {}
  state.suggested = new Set()
  state.unknown = {}
  state.cover = null
  state.result = null
  hideImportNotice()
  hideResult()

  for (const field of fieldsOf(collection)) {
    if (field.default !== undefined) {
      state.values[field.name] = Array.isArray(field.default)
        ? field.default.slice()
        : field.default
    }
    if (field.type === 'date' && (field.required || field.defaultOn)) {
      state.values[field.name] = today()
    }
    if (field.defaultOn) state.enabled.add(field.name)
  }
  state.values.title = ''
  if (fieldOf(collection, 'description')) state.values.description = ''
}

function renderCollections() {
  const grid = el('collectionGrid')
  grid.replaceChildren()
  for (const [key, config] of Object.entries(COLLECTION_CONFIG)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `collection-card${key === state.collection ? ' is-active' : ''}`
    const label = document.createElement('strong')
    label.textContent = config.label
    const path = document.createElement('span')
    path.textContent = config.layout === 'directory' ? `${key}/<目录>/index.md` : `${key}/<文件>.md`
    button.append(label, path)
    button.addEventListener('click', () => {
      if (key === state.collection) return
      resetForCollection(key)
      renderAll()
    })
    grid.appendChild(button)
  }
}

function buildControl(field) {
  const wrap = document.createElement('div')
  const setValue = (value) => {
    state.values[field.name] = value
    state.suggested.delete(field.name)
    renderPath()
    renderPreview()
    renderValidation()
  }

  if (field.type === 'boolean') {
    const label = document.createElement('label')
    label.className = 'field-inline'
    const input = document.createElement('input')
    const text = document.createTextNode('')
    input.type = 'checkbox'
    input.checked = Boolean(state.values[field.name])
    text.textContent = input.checked ? 'true' : 'false'
    input.addEventListener('change', () => {
      text.textContent = input.checked ? 'true' : 'false'
      setValue(input.checked)
    })
    label.append(input, text)
    wrap.appendChild(label)
    return wrap
  }

  if (field.type === 'enum') {
    const select = document.createElement('select')
    for (const option of field.options ?? []) {
      const item = document.createElement('option')
      item.value = option
      item.textContent = option
      item.selected = state.values[field.name] === option
      select.appendChild(item)
    }
    select.addEventListener('change', () => setValue(select.value))
    wrap.appendChild(select)
    return wrap
  }

  if (field.type === 'tags' || field.type === 'entryRef') {
    wrap.appendChild(buildChips(field, setValue))
    return wrap
  }

  if (field.type === 'heroImage') {
    const note = document.createElement('p')
    note.className = 'muted field-small'
    const value = state.values.heroImage
    note.textContent = value
      ? `${value.src} · ${value.color}`
      : state.cover
        ? '封面将在提交后自动提取主色并写入'
        : '尚未设置，拖入封面图后自动写入'
    wrap.appendChild(note)
    return wrap
  }

  const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input')
  if (input instanceof HTMLTextAreaElement) input.rows = 2
  else input.type = field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'
  input.value = state.values[field.name] ?? ''
  if (field.type === 'color') input.placeholder = '#4891B2'
  if (state.suggested.has(field.name)) input.classList.add('is-suggested')
  input.addEventListener('input', () => {
    state.values[field.name] = input.value
    state.suggested.delete(field.name)
    input.classList.remove('is-suggested')
    renderPath()
    renderPreview()
    renderValidation()
  })
  wrap.appendChild(input)
  return wrap
}

function buildChips(field, setValue) {
  const holder = document.createElement('div')
  const box = document.createElement('div')
  box.className = 'chips'
  const list = Array.isArray(state.values[field.name]) ? state.values[field.name] : []

  for (const [index, value] of list.entries()) {
    const chip = document.createElement('span')
    chip.className = 'chip'
    chip.appendChild(document.createTextNode(value))
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.textContent = '×'
    remove.setAttribute('aria-label', `移除 ${value}`)
    remove.addEventListener('click', () => {
      const next = list.slice()
      next.splice(index, 1)
      setValue(next)
      renderFields()
    })
    chip.appendChild(remove)
    box.appendChild(chip)
  }

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = field.type === 'tags' ? '输入后回车' : '选择或输入条目 id'
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const value = input.value.trim()
    if (!value || list.includes(value)) return
    setValue([...list, value])
    renderFields()
  })
  box.appendChild(input)
  holder.appendChild(box)

  const pool =
    field.type === 'tags'
      ? (meta.tags[state.collection] ?? [])
      : (meta.entries[field.refCollection] ?? []).map((value) => ({ value }))
  const available = pool.filter((item) => !list.includes(item.value))
  if (available.length) {
    const suggestions = document.createElement('div')
    suggestions.className = 'tag-suggest'
    for (const item of available.slice(0, 12)) {
      const button = document.createElement('button')
      button.type = 'button'
      button.appendChild(document.createTextNode(item.value))
      if (item.count !== undefined) {
        const count = document.createElement('span')
        count.className = 'count'
        count.textContent = ` ${item.count}`
        button.appendChild(count)
      }
      button.addEventListener('click', () => {
        setValue([...list, item.value])
        renderFields()
      })
      suggestions.appendChild(button)
    }
    holder.appendChild(suggestions)
  }

  if (field.type === 'tags') {
    const collision = list
      .map((value) => ({
        value,
        existing: pool.find((item) => item.value.toLowerCase() === value.toLowerCase())
      }))
      .find(({ value, existing }) => existing && existing.value !== value)
    if (collision) {
      const warning = document.createElement('div')
      warning.className = 'notice compact-notice'
      warning.textContent = `已存在「${collision.existing.value}」，Astro 会视为同一标签`
      holder.appendChild(warning)
    }
  }
  return holder
}

function renderFields() {
  const required = el('requiredFields')
  const optional = el('optionalFields')
  required.replaceChildren()
  optional.replaceChildren()
  let optionalOn = 0

  for (const field of fieldsOf(state.collection)) {
    if (field.required) {
      const label = document.createElement('label')
      label.className = 'field'
      label.append(buildFieldHead(field), buildControl(field))
      required.appendChild(label)
      continue
    }

    const item = document.createElement('div')
    item.className = 'toggle-item'
    const head = document.createElement('label')
    head.className = 'toggle-head'
    const toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.checked = state.enabled.has(field.name)
    toggle.disabled = Boolean(field.readonly && !state.cover)
    if (toggle.checked) optionalOn += 1
    toggle.addEventListener('change', () => {
      if (toggle.checked) state.enabled.add(field.name)
      else state.enabled.delete(field.name)
      renderFields()
      renderPreview()
      renderValidation()
    })
    const name = document.createElement('span')
    name.className = 'toggle-name'
    name.textContent = field.label
    const key = document.createElement('span')
    key.className = 'toggle-key'
    key.textContent = field.hint ? `${field.name} · ${field.hint}` : field.name
    head.append(toggle, name)
    const max = field.maxLength ?? field.softMax
    if (max) head.appendChild(buildCounter(field.name, max))
    head.appendChild(key)
    item.appendChild(head)
    const body = document.createElement('div')
    body.className = `toggle-body${toggle.checked ? '' : ' is-hidden'}`
    body.appendChild(buildControl(field))
    item.appendChild(body)
    optional.appendChild(item)
  }
  el('optionalCount').textContent = `已开启 ${optionalOn} 项`
}

function buildFieldHead(field) {
  const head = document.createElement('span')
  head.className = 'field-label'
  const label = document.createElement('span')
  label.textContent = field.label
  const hint = document.createElement('span')
  hint.className = 'field-hint'
  hint.textContent = ` ${field.name}`
  label.appendChild(hint)
  head.appendChild(label)
  const max = field.maxLength ?? field.softMax
  if (max) head.appendChild(buildCounter(field.name, max))
  return head
}

function buildCounter(name, maximum) {
  const counter = document.createElement('span')
  counter.id = `counter-${name}`
  counter.dataset.max = String(maximum)
  counter.className = 'counter'
  return counter
}

function targetPath() {
  const config = COLLECTION_CONFIG[state.collection]
  if (config.layout === 'flat') {
    const base = state.fileName.trim() || slugFromTitle()
    const file = /\.mdx?$/i.test(base) ? base : `${base}.md`
    return { directoryName: null, dir: null, file, path: `src/content/note/${file}` }
  }
  const directoryName = state.directoryName.trim() || slugFromTitle()
  const rawFile = state.fileName.trim() || 'index.md'
  const file = /\.mdx?$/i.test(rawFile) ? rawFile : `${rawFile}.md`
  return {
    directoryName,
    dir: `src/content/${state.collection}/${directoryName}`,
    file,
    path: `src/content/${state.collection}/${directoryName}/${file}`
  }
}

function slugFromTitle() {
  return String(state.values.title ?? '').trim() || '未命名'
}

function renderPath() {
  const target = targetPath()
  const config = COLLECTION_CONFIG[state.collection]
  el('pathText').textContent = target.path
  el('directoryField').classList.toggle('is-hidden', config.layout === 'flat')
  el('locationRow').classList.toggle('is-single', config.layout === 'flat')
  el('coverBlock').classList.toggle('is-hidden', !config.cover)
  el('fileNameHint').textContent = config.layout === 'flat' ? '默认从标题派生' : '默认 index.md'
  el('fileName').placeholder = config.layout === 'flat' ? '从标题派生' : 'index.md'

  const directoryError =
    config.layout === 'directory' ? checkSegment(target.directoryName, '目录名') : null
  const fileError = validateFileName(target.file)
  setInputError('directoryName', 'directoryError', directoryError)
  setInputError('fileName', 'fileError', fileError)

  const status = el('pathStatus')
  if (directoryError || fileError) {
    status.className = 'path-status is-conflict'
    status.textContent = '路径无效'
  } else if (state.pathCheck.path !== target.path) {
    state.pathCheck = { path: target.path, exists: false, pending: true, error: '' }
    status.className = 'path-status'
    status.textContent = '检查中…'
    schedulePathCheck(target)
  } else if (state.pathCheck.pending) {
    status.className = 'path-status'
    status.textContent = '检查中…'
  } else if (state.pathCheck.error) {
    status.className = 'path-status is-conflict'
    status.textContent = '检查失败'
  } else {
    status.className = `path-status ${state.pathCheck.exists ? 'is-conflict' : 'is-ok'}`
    status.textContent = state.pathCheck.exists
      ? config.layout === 'flat'
        ? '文件已存在'
        : '目录已存在'
      : '可用'
  }

  const hasServerConflict =
    state.pathCheck.path === target.path && !state.pathCheck.pending && state.pathCheck.exists
  if (!directoryError && config.layout === 'directory') {
    setInputError('directoryName', 'directoryError', hasServerConflict ? '目录已存在' : null)
  }
  if (!fileError && config.layout === 'flat') {
    setInputError('fileName', 'fileError', hasServerConflict ? '文件已存在' : null)
  }
  return target
}

function schedulePathCheck(target) {
  clearTimeout(pathTimer)
  const sequence = ++pathSequence
  pathTimer = setTimeout(async () => {
    try {
      const result = await api('/api/check-path', {
        method: 'POST',
        body: JSON.stringify({
          collection: state.collection,
          directoryName: target.directoryName,
          fileName: target.file
        })
      })
      if (sequence !== pathSequence || state.pathCheck.path !== target.path) return
      state.pathCheck = { path: target.path, exists: result.exists, pending: false, error: '' }
    } catch (error) {
      if (sequence !== pathSequence || state.pathCheck.path !== target.path) return
      state.pathCheck = { path: target.path, exists: false, pending: false, error: error.message }
    }
    renderPath()
    renderValidation()
  }, 300)
}

function collectIssues() {
  const errors = []
  const warnings = []
  const config = COLLECTION_CONFIG[state.collection]

  for (const field of fieldsOf(state.collection)) {
    const value = state.values[field.name]
    if (!field.required && !state.enabled.has(field.name)) continue
    if (field.required && field.type !== 'textarea' && !String(value ?? '').trim()) {
      errors.push(`${field.label}不能为空`)
    }
    if (field.maxLength && String(value ?? '').length > field.maxLength) {
      errors.push(`${field.label}超过 ${field.maxLength} 字符`)
    }
    if (field.softMax && String(value ?? '').length > field.softMax) {
      warnings.push(`${field.label}超过建议的 ${field.softMax} 字符`)
    }
    if (field.type === 'date' && value && !isCalendarDate(value))
      errors.push(`${field.label}日期无效`)
    if (field.type === 'color' && value && !/^#[0-9a-f]{6}$/i.test(value)) {
      warnings.push('主题色建议使用 #RRGGBB 格式')
    }
    if (field.type === 'url' && value) {
      try {
        new URL(value)
      } catch {
        errors.push('来源链接必须是合法 URL')
      }
    }
  }

  if (
    POST_COLLECTIONS.includes(state.collection) &&
    !String(state.values.description ?? '').trim()
  ) {
    warnings.push('摘要为空，可通过校验但不利于 SEO')
  }
  const target = targetPath()
  if (config.layout === 'directory') {
    const issue = checkSegment(target.directoryName, '目录名')
    if (issue) errors.push(issue)
  }
  const fileIssue = validateFileName(target.file)
  if (fileIssue) errors.push(fileIssue)
  if (state.pathCheck.path === target.path) {
    if (state.pathCheck.exists) errors.push('目标已存在')
    if (state.pathCheck.error) errors.push(`路径检查失败：${state.pathCheck.error}`)
  }
  if (/\]\(\.{1,2}\//u.test(activeBody())) {
    warnings.push('正文含本地图片引用，v1 不会自动复制图片')
  }
  if (state.cover?.color && !/^#[0-9a-f]{6}$/i.test(state.cover.color)) {
    errors.push('封面主色必须使用 #RRGGBB 格式')
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] }
}

function renderValidation() {
  const { errors, warnings } = collectIssues()
  const target = targetPath()
  const pending = state.pathCheck.path === target.path && state.pathCheck.pending
  const box = el('validation')
  box.className = `validation${errors.length ? ' is-error' : ''}`
  box.textContent = errors.length
    ? `${errors[0]}${errors.length > 1 ? `（共 ${errors.length} 项）` : ''}`
    : pending
      ? '正在检查目标路径…'
      : warnings.length
        ? warnings[0]
        : '校验通过'
  el('createBtn').disabled = errors.length > 0 || pending || state.creating
  el('createBtn').textContent = state.creating ? '生成中…' : '生成文章'
}

function renderPreview() {
  const documentText = currentDocument()
  el('preview').innerHTML = highlight(documentText)
  const knownFrontmatter = renderFrontmatter(
    state.collection,
    state.values,
    state.enabled,
    state.unknown
  )
  const fieldCount = knownFrontmatter
    .split('\n')
    .filter((line) => /^[A-Za-z][\w]*:/u.test(line)).length
  const tagCount = Array.isArray(state.values.tags) ? state.values.tags.length : 0
  el('stats').innerHTML = `
    <div><dt>字段</dt><dd>${fieldCount}</dd></div>
    <div><dt>标签</dt><dd>${tagCount}</dd></div>
    <div><dt>正文</dt><dd>${activeBody().trim().length}</dd></div>`
  updateCounters()
}

function currentDocument() {
  return renderDocument(state.collection, state.values, state.enabled, activeBody(), state.unknown)
}

function activeBody() {
  return state.bodyMode === 'empty' ? '' : state.body
}

function highlight(text) {
  return text
    .replace(/[&<>]/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character])
    .split('\n')
    .map((line) => {
      if (line === '---') return '<span class="d">---</span>'
      return line
        .replace(/('[^']*'|"[^"\\]*(?:\\.[^"\\]*)*")/gu, '<span class="s">$1</span>')
        .replace(/^(\s*)([\w]+)(:)/u, '$1<span class="k">$2</span>$3')
    })
    .join('\n')
}

function updateCounters() {
  for (const counter of document.querySelectorAll('.counter')) {
    const name = counter.id.replace('counter-', '')
    const maximum = Number(counter.dataset.max)
    const length = String(state.values[name] ?? '').length
    counter.textContent = `${length} / ${maximum}`
    const descriptor = fieldOf(state.collection, name)
    counter.classList.toggle('is-over', Boolean(descriptor?.maxLength && length > maximum))
    counter.classList.toggle('is-warning', Boolean(descriptor?.softMax && length > maximum))
  }
}

function applyImport(raw) {
  const parsed = parseFrontmatter(raw, state.collection)
  if (!parsed) {
    state.unknown = {}
    state.suggested = new Set()
    state.body = raw.trim()
    showImportNotice(['frontmatter 无法解析，已把整段内容作为正文。'], true)
    renderAll()
    return
  }

  const collection = state.collection
  resetForCollection(collection)
  Object.assign(state.values, parsed.fields)
  state.unknown = parsed.unknown
  state.body = parsed.body
  state.suggested = new Set(parsed.suggested)
  for (const name of Object.keys(parsed.fields)) {
    if (!fieldOf(collection, name)?.required) state.enabled.add(name)
  }
  el('pasteInput').value = state.body

  const messages = parsed.hasFrontmatter
    ? ['已解析 frontmatter 并预填表单，不会重复包裹。']
    : ['已作为纯正文导入。']
  if (!parsed.hasFrontmatter && parsed.fields.title) {
    messages.push(`已提取「# ${parsed.fields.title}」作为标题，并从正文删除该行。`)
  }
  if (!parsed.hasFrontmatter && parsed.fields.description) {
    messages.push('已用首段生成摘要；琥珀色标记的是建议值。')
  }
  const unknownKeys = Object.keys(parsed.unknown)
  if (unknownKeys.length) {
    messages.push(`以下字段不受表单管理，将原样保留：${unknownKeys.join('、')}`)
  }
  showImportNotice(messages)
  renderAll()
}

function showImportNotice(messages, isError = false) {
  const notice = el('importNotice')
  notice.replaceChildren()
  notice.classList.remove('is-hidden')
  notice.classList.toggle('is-error-notice', isError)
  for (const message of messages) {
    const line = document.createElement('div')
    line.textContent = message
    notice.appendChild(line)
  }
}

function hideImportNotice() {
  el('importNotice')?.classList.add('is-hidden')
}

function renderPresets() {
  const select = el('presetSelect')
  select.innerHTML = '<option value="">不使用</option>'
  for (const preset of meta.presets) {
    const option = document.createElement('option')
    option.value = preset.name
    option.textContent = `${preset.name} · ${COLLECTION_CONFIG[preset.collection].label}`
    select.appendChild(option)
  }
  el('deletePresetBtn').disabled = !select.value
}

function applyPreset(name) {
  const preset = meta.presets.find((item) => item.name === name)
  el('deletePresetBtn').disabled = !preset
  if (!preset) return
  const needsNumber = JSON.stringify(preset).includes('{{n}}')
  const number = needsNumber ? window.prompt('第几期？', '1') : null
  if (needsNumber && number === null) {
    el('presetSelect').value = ''
    return
  }

  resetForCollection(preset.collection)
  for (const key of preset.enabled ?? []) state.enabled.add(key)
  for (const [key, value] of Object.entries(preset.fields ?? {})) {
    state.values[key] = expandValue(value, number)
  }
  if (preset.directoryName) state.directoryName = expandPlaceholders(preset.directoryName, number)
  el('directoryName').value = state.directoryName
  renderAll()
}

async function savePreset() {
  const name = window.prompt('预设名称')
  if (!name) return
  const fields = {}
  for (const field of fieldsOf(state.collection)) {
    if (['publishDate', 'date', 'updatedDate', 'heroImage'].includes(field.name)) continue
    if (field.required || state.enabled.has(field.name))
      fields[field.name] = state.values[field.name]
  }
  meta.presets = await api('/api/presets', {
    method: 'POST',
    body: JSON.stringify({
      name,
      collection: state.collection,
      directoryName:
        COLLECTION_CONFIG[state.collection].layout === 'directory'
          ? state.directoryName
          : undefined,
      enabled: [...state.enabled].filter((field) => field !== 'heroImage'),
      fields
    })
  })
  renderPresets()
  el('presetSelect').value = name
  el('deletePresetBtn').disabled = false
}

async function deletePreset() {
  const name = el('presetSelect').value
  if (!name || !window.confirm(`删除预设「${name}」？`)) return
  meta.presets = await api(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' })
  renderPresets()
}

async function createArticle() {
  const { errors } = collectIssues()
  if (errors.length || state.pathCheck.pending || state.creating) return
  state.creating = true
  state.result = null
  hideResult()
  renderValidation()

  const target = targetPath()
  const fields = {}
  for (const field of fieldsOf(state.collection)) {
    if (field.required || state.enabled.has(field.name))
      fields[field.name] = state.values[field.name]
  }

  let created
  try {
    created = await api('/api/create', {
      method: 'POST',
      body: JSON.stringify({
        collection: state.collection,
        directoryName: target.directoryName,
        fileName: target.file,
        fields,
        unknown: state.unknown,
        body: activeBody()
      })
    })

    let coverResult = null
    if (state.cover) {
      const form = new FormData()
      form.append('file', state.cover.file)
      form.append('markdownPath', created.markdownPath)
      form.append('name', state.cover.outputName)
      form.append('quality', '82')
      form.append('width', '1920')
      if (state.cover.color) form.append('color', state.cover.color)
      coverResult = await api('/api/cover', { method: 'POST', body: form })
      state.cover.color = coverResult.color
      state.values.heroImage = {
        src: `./${coverResult.outputPath.split('/').at(-1)}`,
        color: coverResult.color
      }
      state.enabled.add('heroImage')
      renderPreview()
    }

    state.result = { ...created, cover: coverResult, error: '' }
    showResult()
    state.pathCheck = { path: target.path, exists: true, pending: false, error: '' }
    renderPath()
  } catch (error) {
    state.result = created
      ? { ...created, error: `文章已创建，但后续处理失败：${error.message}` }
      : { error: error.message }
    showResult()
  } finally {
    state.creating = false
    renderValidation()
  }
}

function showResult() {
  const result = state.result
  const box = el('resultBox')
  box.classList.remove('is-hidden')
  box.classList.toggle('is-result-error', Boolean(result.error))
  el('resultTitle').textContent = result.error ? '生成未完全成功' : '文章已生成'
  el('resultMessage').textContent = result.error || `${result.markdownPath} · ${result.entryId}`
  const hasPath = Boolean(result.markdownPath)
  el('openResultBtn').disabled = !hasPath
  el('copyPathBtn').disabled = !hasPath
}

function hideResult() {
  el('resultBox')?.classList.add('is-hidden')
}

function bindEvents() {
  el('directoryName').addEventListener('input', (event) => {
    state.directoryName = event.target.value
    renderPath()
    renderValidation()
  })
  el('fileName').addEventListener('input', (event) => {
    state.fileName = event.target.value
    renderPath()
    renderValidation()
  })

  for (const tab of document.querySelectorAll('#bodyTabs .tab')) {
    tab.addEventListener('click', () => {
      state.bodyMode = tab.dataset.mode
      for (const other of document.querySelectorAll('#bodyTabs .tab')) {
        other.classList.toggle('is-active', other === tab)
      }
      for (const panel of document.querySelectorAll('.tab-panel')) {
        panel.classList.toggle('is-hidden', panel.dataset.panel !== state.bodyMode)
      }
      renderPreview()
      renderValidation()
    })
  }

  el('pasteInput').addEventListener('input', (event) => {
    clearTimeout(importTimer)
    importTimer = setTimeout(() => applyImport(event.target.value), 250)
  })
  bindDropzone(el('mdDropzone'), el('mdFileInput'), async (file) => applyImport(await file.text()))
  bindDropzone(el('coverDropzone'), el('coverInput'), (file) => {
    const outputName = file.name.replace(/\.[^.]+$/u, '') || 'cover'
    state.cover = { file, outputName, name: `${outputName}.webp`, color: '' }
    delete state.values.heroImage
    state.enabled.delete('heroImage')
    el('coverMeta').classList.remove('is-hidden')
    el('coverName').textContent = `${outputName}.webp`
    el('coverColor').value = ''
    el('coverSwatch').style.background = 'transparent'
    renderAll()
  })
  el('coverColor').addEventListener('input', (event) => {
    const color = event.target.value.trim()
    state.cover.color = color
    el('coverSwatch').style.background = /^#[0-9a-f]{6}$/i.test(color) ? color : 'transparent'
    if (color) {
      state.values.heroImage = { src: `./${state.cover.name}`, color }
      state.enabled.add('heroImage')
    } else {
      delete state.values.heroImage
      state.enabled.delete('heroImage')
    }
    renderFields()
    renderPreview()
    renderValidation()
  })
  el('coverClear').addEventListener('click', () => {
    state.cover = null
    delete state.values.heroImage
    state.enabled.delete('heroImage')
    el('coverMeta').classList.add('is-hidden')
    renderAll()
  })

  el('presetSelect').addEventListener('change', (event) => applyPreset(event.target.value))
  el('savePresetBtn').addEventListener('click', () => savePreset().catch(showActionError))
  el('deletePresetBtn').addEventListener('click', () => deletePreset().catch(showActionError))
  el('copyBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(currentDocument())
    flashButton(el('copyBtn'), '已复制', '复制')
  })
  el('createBtn').addEventListener('click', createArticle)
  el('openResultBtn').addEventListener('click', async () => {
    await api('/api/open', {
      method: 'POST',
      body: JSON.stringify({ path: state.result.markdownPath })
    })
  })
  el('copyPathBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.result.markdownPath)
    flashButton(el('copyPathBtn'), '已复制', '复制路径')
  })
}

function bindDropzone(zone, input, onFile) {
  zone.addEventListener('click', () => input.click())
  input.addEventListener('change', () => input.files[0] && onFile(input.files[0]))
  zone.addEventListener('dragover', (event) => {
    event.preventDefault()
    zone.classList.add('is-over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', (event) => {
    event.preventDefault()
    zone.classList.remove('is-over')
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  })
}

function renderAll() {
  renderCollections()
  renderFields()
  renderPath()
  renderPreview()
  renderValidation()
}

async function api(path, options) {
  const response = await fetch(path, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options?.headers }
  })
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

function setInputError(inputId, errorId, message) {
  const input = el(inputId)
  const error = el(errorId)
  input.classList.toggle('is-invalid', Boolean(message))
  error.classList.toggle('is-shown', Boolean(message))
  error.textContent = message ?? ''
}

function checkSegment(value, label) {
  if (!value.trim()) return `${label}不能为空`
  if (value.trim() !== value) return `${label}不能以空格开头或结尾`
  if (/[<>:"/\\|?*\u0000-\u001f]/u.test(value)) return `${label}包含 Windows 路径不支持的字符`
  if (/[. ]$/u.test(value)) return `${label}不能以句点或空格结尾`
  const base = value.split('.')[0]?.toUpperCase()
  if (base && /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(base)) {
    return `${label}不能使用 Windows 保留名称：${base}`
  }
  return null
}

function validateFileName(file) {
  const withoutExtension = file.replace(/\.mdx?$/iu, '')
  return (
    checkSegment(withoutExtension, '文件名') ??
    (file.includes('.') && !/\.mdx?$/iu.test(file) ? '文件扩展名只能是 .md 或 .mdx' : null)
  )
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
}

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function expandPlaceholders(text, number) {
  const date = today()
  const [year, month, day] = date.split('-')
  return String(text)
    .replaceAll('{{date}}', date)
    .replaceAll('{{year}}', year)
    .replaceAll('{{month}}', month)
    .replaceAll('{{day}}', day)
    .replaceAll('{{n}}', number ?? '')
}

function expandValue(value, number) {
  if (typeof value === 'string') return expandPlaceholders(value, number)
  if (Array.isArray(value)) return value.map((item) => expandValue(item, number))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, expandValue(item, number)])
    )
  }
  return value
}

function flashButton(button, active, normal) {
  button.textContent = active
  setTimeout(() => (button.textContent = normal), 1200)
}

function showActionError(error) {
  window.alert(error.message)
}

resetForCollection('blog')
renderPresets()
bindEvents()
renderAll()
