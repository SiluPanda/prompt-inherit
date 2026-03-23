import type { PromptConfig, Mixin, SectionValue, MergeStrategy } from './types.js'

const SECTION_SEPARATOR = '\n\n'

interface ChainNode {
  config: PromptConfig
  mixins: Mixin[]
}

function getSectionStrategy(value: SectionValue): { content: string; strategy: MergeStrategy } {
  if (typeof value === 'string') {
    return { content: value, strategy: 'replace' }
  }
  return { content: value.content, strategy: value.strategy }
}

function applyStrategy(
  accumulated: string | undefined,
  content: string,
  strategy: MergeStrategy,
  separator: string
): string | undefined {
  switch (strategy) {
    case 'replace':
      return content
    case 'prepend':
      return accumulated !== undefined && accumulated !== ''
        ? content + separator + accumulated
        : content
    case 'append':
      return accumulated !== undefined && accumulated !== ''
        ? accumulated + separator + content
        : content
    case 'remove':
      return undefined
  }
}

export function resolveSection(sectionName: string, chain: ChainNode[]): string {
  // Walk chain child-first (index 0 = current, last = root)
  // Collect (value, separator) pairs per node; apply root-first so child wins
  // We need to apply in child-first order per the spec, but "replace" from child
  // should win over parent, so we process root → child to let child be last.
  // Actually spec says walk child → root and accumulate; let's re-read:
  //   "walk chain child → root, applying merge strategies"
  //   "Start with undefined accumulated result"
  //   "For each node in chain (child first, then parent): apply mixin sections first, then node's own section"
  // This means child's definition is applied FIRST. With replace strategy, child replaces undefined.
  // Then parent with replace would overwrite child — that is wrong for inheritance.
  // The correct semantic is: parent provides baseline, child overrides.
  // So we reverse: walk root → child, building accumulated, and child's value is applied last.

  const reversedChain = [...chain].reverse() // root-first

  let accumulated: string | undefined = undefined
  const separator = chain[0]?.config.sectionSeparator ?? SECTION_SEPARATOR

  for (const node of reversedChain) {
    // Apply node's own section first (provides baseline), then mixins modify it
    const definitions: SectionValue[] = []

    const nodeVal = node.config.sections[sectionName]
    if (nodeVal !== undefined) {
      definitions.push(nodeVal)
    }

    for (const mixin of node.mixins) {
      const mixinVal = mixin.sections[sectionName]
      if (mixinVal !== undefined) {
        definitions.push(mixinVal)
      }
    }

    for (const def of definitions) {
      const { content, strategy } = getSectionStrategy(def)
      accumulated = applyStrategy(accumulated, content, strategy, separator)
    }
  }

  return accumulated ?? ''
}

export function resolveSectionOrder(chain: ChainNode[]): string[] {
  // Child's order takes priority, parent fills gaps
  const allSectionNames = getAllSectionNames(chain)
  const childOrder = chain[0]?.config.sectionOrder

  if (!childOrder || childOrder.length === 0) {
    // Walk chain root-first to build merged order
    const seen = new Set<string>()
    const order: string[] = []
    const reversedChain = [...chain].reverse()
    for (const node of reversedChain) {
      const nodeOrder = node.config.sectionOrder ?? Object.keys(node.config.sections)
      for (const name of nodeOrder) {
        if (!seen.has(name)) {
          seen.add(name)
          order.push(name)
        }
      }
      // Also add mixin section names
      for (const mixin of node.mixins) {
        for (const name of Object.keys(mixin.sections)) {
          if (!seen.has(name)) {
            seen.add(name)
            order.push(name)
          }
        }
      }
    }
    // Append any remaining
    for (const name of allSectionNames) {
      if (!seen.has(name)) {
        order.push(name)
      }
    }
    return order
  }

  // Start with child order, then fill gaps from parent
  const seen = new Set<string>(childOrder)
  const order = [...childOrder]

  const reversedChain = [...chain].reverse()
  for (const node of reversedChain) {
    const nodeOrder = node.config.sectionOrder ?? Object.keys(node.config.sections)
    for (const name of nodeOrder) {
      if (!seen.has(name)) {
        seen.add(name)
        order.push(name)
      }
    }
    for (const mixin of node.mixins) {
      for (const name of Object.keys(mixin.sections)) {
        if (!seen.has(name)) {
          seen.add(name)
          order.push(name)
        }
      }
    }
  }

  // Append any remaining that don't appear in any order
  for (const name of allSectionNames) {
    if (!seen.has(name)) {
      order.push(name)
    }
  }

  return order
}

function getAllSectionNames(chain: ChainNode[]): string[] {
  const seen = new Set<string>()
  for (const node of chain) {
    for (const name of Object.keys(node.config.sections)) {
      seen.add(name)
    }
    for (const mixin of node.mixins) {
      for (const name of Object.keys(mixin.sections)) {
        seen.add(name)
      }
    }
  }
  return Array.from(seen)
}

export function resolveAllSections(chain: ChainNode[]): Record<string, string> {
  const names = getAllSectionNames(chain)
  const result: Record<string, string> = {}
  for (const name of names) {
    result[name] = resolveSection(name, chain)
  }
  return result
}

export type { ChainNode }
