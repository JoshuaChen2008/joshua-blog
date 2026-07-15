import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import sharp from 'sharp'

import {
  assertDirectBlogDirectory,
  assertSafePathSegment,
  BlogToolError,
  escapeYamlSingleQuoted,
  formatError,
  getBlogDirectory
} from './shared'

interface ConvertCoverOptions {
  readonly projectRoot: string
  readonly inputPath: string
  readonly outputName?: string
  readonly quality?: number
  readonly width?: number
  readonly color?: string
  readonly force?: boolean
  readonly removeSource?: boolean
}

interface ConvertedCover {
  readonly inputPath: string
  readonly outputPath: string
  readonly markdownPath: string
  readonly color: string
}

interface CoverCliOptions {
  readonly inputPath: string
  readonly outputName?: string
  readonly quality?: number
  readonly width?: number
  readonly color?: string
  readonly force: boolean
  readonly removeSource: boolean
}

const DEFAULT_QUALITY = 82
const DEFAULT_WIDTH = 1920
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/iu
const HELP_TEXT = `用法：
  bun run blog:cover -- <文章目录内的图片> [选项]

选项：
  --name <文件名>       指定输出文件名，扩展名固定为 .webp
  --quality <1-100>     WebP 质量，默认 82
  --width <像素>        最大宽度，默认 1920
  --color <#RRGGBB>     覆盖自动提取的封面主色
  --force               覆盖已经存在的 WebP
  --remove-source       转换成功后删除原图

示例：
  bun run blog:cover -- "src/content/blog/暑假-第二周/封面.png"
  bun run blog:cover -- "src/content/blog/暑假-第二周/封面.png" --name cover --color "#FFE4B5"`

export async function convertBlogCover(options: ConvertCoverOptions): Promise<ConvertedCover> {
  const inputPath = resolve(options.projectRoot, options.inputPath)
  const articleDirectory = dirname(inputPath)
  const blogRoot = getBlogDirectory(options.projectRoot)
  assertDirectBlogDirectory(blogRoot, articleDirectory)
  await assertRegularFile(inputPath)

  const markdownPath = await findArticleMarkdown(articleDirectory)
  const outputName = normalizeOutputName(
    options.outputName ?? basename(inputPath, extname(inputPath))
  )
  const outputPath = resolve(articleDirectory, outputName)
  const quality = normalizeInteger(options.quality ?? DEFAULT_QUALITY, 'quality', 1, 100)
  const width = normalizeInteger(options.width ?? DEFAULT_WIDTH, 'width', 1, 10000)
  const requestedColor = options.color ? normalizeColor(options.color) : undefined

  if (!options.force) {
    await assertPathDoesNotExist(outputPath)
  }

  let outputBuffer: Buffer
  try {
    outputBuffer = await sharp(inputPath)
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer()
  } catch (error) {
    throw new BlogToolError(`封面转换失败：${formatError(error)}`)
  }

  const color = requestedColor ?? (await extractDominantColor(outputBuffer))
  const markdown = await readFile(markdownPath, 'utf8')
  const updatedMarkdown = upsertHeroImage(markdown, basename(outputPath), color)

  await writeFile(outputPath, outputBuffer, { flag: options.force ? 'w' : 'wx' })
  await writeFile(markdownPath, updatedMarkdown, 'utf8')

  if (options.removeSource && inputPath !== outputPath) {
    await unlink(inputPath)
  }

  return { inputPath, outputPath, markdownPath, color }
}

export function parseCoverArguments(args: readonly string[]): CoverCliOptions {
  if (args.includes('--help') || args.includes('-h')) {
    throw new BlogToolError(HELP_TEXT)
  }

  const inputPath = args[0]
  if (!inputPath || inputPath.startsWith('--')) {
    throw new BlogToolError(`缺少封面图片路径\n\n${HELP_TEXT}`)
  }

  let outputName: string | undefined
  let quality: number | undefined
  let width: number | undefined
  let color: string | undefined
  let force = false
  let removeSource = false

  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--force' || argument === '--remove-source') {
      force = force || argument === '--force'
      removeSource = removeSource || argument === '--remove-source'
      continue
    }

    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new BlogToolError(`${argument} 缺少值`)
    }

    if (argument === '--name') {
      outputName = value
    } else if (argument === '--quality') {
      quality = parseNumberArgument(value, '--quality')
    } else if (argument === '--width') {
      width = parseNumberArgument(value, '--width')
    } else if (argument === '--color') {
      color = value
    } else {
      throw new BlogToolError(`未知参数：${argument}\n\n${HELP_TEXT}`)
    }
    index += 1
  }

  return { inputPath, outputName, quality, width, color, force, removeSource }
}

export function upsertHeroImage(markdown: string, imageName: string, color: string): string {
  const lineEnding = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/u)

  if (lines[0] !== '---') {
    throw new BlogToolError('文章缺少有效的 frontmatter 起始分隔符')
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---')
  if (closingIndex === -1) {
    throw new BlogToolError('文章缺少有效的 frontmatter 结束分隔符')
  }

  const heroLine = `heroImage: { src: './${escapeYamlSingleQuoted(imageName)}', color: '${color}' }`
  const heroIndex = lines.findIndex(
    (line, index) => index > 0 && index < closingIndex && /^heroImage\s*:/u.test(line)
  )

  if (heroIndex === -1) {
    lines.splice(closingIndex, 0, heroLine)
  } else {
    let endIndex = heroIndex + 1
    while (endIndex < closingIndex && /^\s+/u.test(lines[endIndex] ?? '')) {
      endIndex += 1
    }
    lines.splice(heroIndex, endIndex - heroIndex, heroLine)
  }

  return lines.join(lineEnding)
}

async function assertRegularFile(filePath: string): Promise<void> {
  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      throw new BlogToolError(`输入路径不是文件：${filePath}`)
    }
  } catch (error) {
    if (error instanceof BlogToolError) {
      throw error
    }
    throw new BlogToolError(`找不到封面图片：${filePath}`)
  }
}

async function assertPathDoesNotExist(filePath: string): Promise<void> {
  try {
    await stat(filePath)
  } catch {
    return
  }
  throw new BlogToolError(`目标文件已存在，请使用 --force 覆盖：${filePath}`)
}

async function findArticleMarkdown(articleDirectory: string): Promise<string> {
  const entries = await readdir(articleDirectory, { withFileTypes: true })
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && /\.(md|mdx)$/iu.test(entry.name))
    .map((entry) => entry.name)

  if (markdownFiles.length !== 1) {
    throw new BlogToolError(
      `文章目录必须且只能包含一个 Markdown 文件，当前找到 ${markdownFiles.length} 个`
    )
  }

  return resolve(articleDirectory, markdownFiles[0] as string)
}

function normalizeOutputName(value: string): string {
  const extension = extname(value)
  const baseName = extension ? basename(value, extension) : value
  const safeName = assertSafePathSegment(baseName, '输出图片名')
  return `${safeName}.webp`
}

function normalizeInteger(value: number, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new BlogToolError(`${label} 必须是 ${minimum}-${maximum} 之间的整数`)
  }
  return value
}

function parseNumberArgument(value: string, label: string): number {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    throw new BlogToolError(`${label} 必须是数字`)
  }
  return parsedValue
}

function normalizeColor(value: string): string {
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new BlogToolError('颜色必须使用 #RRGGBB 格式')
  }
  return value.toUpperCase()
}

async function extractDominantColor(image: Buffer): Promise<string> {
  const { dominant } = await sharp(image).stats()
  return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase()
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    if (args.includes('--help') || args.includes('-h')) {
      console.log(HELP_TEXT)
      return
    }

    const cliOptions = parseCoverArguments(args)
    const result = await convertBlogCover({
      projectRoot: process.cwd(),
      ...cliOptions
    })
    console.log(`已生成 WebP：${result.outputPath}`)
    console.log(`已更新文章封面：${result.markdownPath}`)
    console.log(`封面主色：${result.color}`)
  } catch (error) {
    console.error(formatError(error))
    process.exitCode = 1
  }
}

if (import.meta.main) {
  await main()
}
