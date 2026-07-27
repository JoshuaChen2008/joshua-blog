import type { MarkdownHeading } from 'astro'

export interface TocItem extends MarkdownHeading {
  subheadings: TocItem[]
}

export function generateToc(headings: readonly MarkdownHeading[]): TocItem[] {
  const root: TocItem = { depth: 0, slug: 'root', text: 'Root', subheadings: [] }
  const stack: TocItem[] = [root]

  headings.forEach((headingData) => {
    const heading: TocItem = { ...headingData, subheadings: [] }

    while (stack.length > 1 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop()
    }

    stack[stack.length - 1].subheadings.push(heading)
    stack.push(heading)
  })

  return root.subheadings
}
