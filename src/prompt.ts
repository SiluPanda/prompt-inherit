import type {
  PromptConfig,
  ExtendOptions,
  Mixin,
  RenderOptions,
  SectionValue,
  PromptMessage,
  AnthropicPromptOutput,
} from './types.js'
import { resolveAllSections, resolveSectionOrder } from './resolve.js'
import type { ChainNode } from './resolve.js'
import { renderToString, renderToMessages, renderToAnthropic, renderToSections } from './render.js'
import { substituteVariables, substituteSlots } from './substitute.js'

const DEFAULT_SEPARATOR = '\n\n'

export class Prompt {
  constructor(
    private _config: PromptConfig,
    private _parent: Prompt | null,
    private _mixins: Mixin[],
    private _boundVariables: Record<string, unknown>,
    private _boundSlots: Record<string, string>
  ) {}

  get name(): string | undefined {
    return this._config.name
  }

  get parent(): Prompt | null {
    return this._parent
  }

  get depth(): number {
    let d = 0
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Prompt | null = this
    while (current._parent !== null) {
      d++
      current = current._parent
    }
    return d
  }

  extend(overrides: ExtendOptions): Prompt {
    const newConfig: PromptConfig = {
      name: overrides.name,
      sections: { ...overrides.sections },
      variables: { ...overrides.variables },
      slots: {},
      sectionOrder: overrides.sectionOrder,
      metadata: { ...overrides.metadata },
    }

    const newSlots: Record<string, string> = {}
    if (overrides.slots) {
      Object.assign(newSlots, overrides.slots)
    }

    return new Prompt(newConfig, this, [], {}, newSlots)
  }

  with(mixin: Mixin): Prompt {
    return new Prompt(
      this._config,
      this._parent,
      [...this._mixins, mixin],
      { ...this._boundVariables },
      { ...this._boundSlots }
    )
  }

  override(sections: Record<string, SectionValue>): Prompt {
    const newConfig: PromptConfig = {
      ...this._config,
      sections: { ...this._config.sections, ...sections },
    }
    return new Prompt(newConfig, this._parent, this._mixins, { ...this._boundVariables }, { ...this._boundSlots })
  }

  set(variables: Record<string, unknown>): Prompt {
    return new Prompt(
      this._config,
      this._parent,
      this._mixins,
      { ...this._boundVariables, ...variables },
      { ...this._boundSlots }
    )
  }

  private _buildChain(): ChainNode[] {
    const chain: ChainNode[] = []
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Prompt | null = this
    while (current !== null) {
      chain.push({ config: current._config, mixins: current._mixins })
      current = current._parent
    }
    return chain
  }

  render(
    options?: RenderOptions
  ): string | PromptMessage[] | AnthropicPromptOutput | Record<string, string> {
    const chain = this._buildChain()
    let rawSections = resolveAllSections(chain)

    // Apply include/exclude filters
    if (options?.includeSections && options.includeSections.length > 0) {
      const include = new Set(options.includeSections)
      rawSections = Object.fromEntries(Object.entries(rawSections).filter(([k]) => include.has(k)))
    }
    if (options?.excludeSections && options.excludeSections.length > 0) {
      const exclude = new Set(options.excludeSections)
      rawSections = Object.fromEntries(Object.entries(rawSections).filter(([k]) => !exclude.has(k)))
    }

    // Merge bound variables with options.variables (options takes precedence)
    const allVariables: Record<string, unknown> = { ...this._boundVariables, ...options?.variables }

    // Collect all bound slots from chain (child-first wins)
    const allSlots: Record<string, string> = {}
    const chainNodes = this._buildChain()
    for (let i = chainNodes.length - 1; i >= 0; i--) {
      const node = chainNodes[i]
      if (node.config.slots) {
        // slots in config are SlotDefinition (with default), not bound strings
        for (const [k, slotDef] of Object.entries(node.config.slots)) {
          if (typeof slotDef === 'object' && slotDef !== null && 'default' in slotDef) {
            const def = slotDef as { default?: string }
            if (def.default !== undefined) {
              allSlots[k] = def.default
            }
          }
        }
      }
    }
    // Bound slots from prompt instances (child-first, so iterate root→child in reversed chain)
    const prompts: Prompt[] = []
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Prompt | null = this
    while (cur !== null) {
      prompts.push(cur)
      cur = cur._parent
    }
    for (let i = prompts.length - 1; i >= 0; i--) {
      Object.assign(allSlots, prompts[i]._boundSlots)
    }

    // Apply substitutions to each section
    const substituted: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawSections)) {
      let val = v
      if (Object.keys(allVariables).length > 0) {
        val = substituteVariables(val, allVariables)
      }
      if (Object.keys(allSlots).length > 0) {
        val = substituteSlots(val, allSlots)
      }
      substituted[k] = val
    }

    const order = resolveSectionOrder(chain)
    const separator =
      options?.sectionSeparator ??
      this._config.sectionSeparator ??
      DEFAULT_SEPARATOR

    const fmt = options?.format ?? 'string'

    switch (fmt) {
      case 'string':
        return renderToString(substituted, order, separator)
      case 'messages':
        return renderToMessages(substituted, order)
      case 'anthropic':
        return renderToAnthropic(substituted, order)
      case 'sections':
        return renderToSections(substituted)
    }
  }

  toMessages(options?: Omit<RenderOptions, 'format'>): PromptMessage[] {
    return this.render({ ...options, format: 'messages' }) as PromptMessage[]
  }

  getSection(name: string): string | undefined {
    const chain = this._buildChain()
    const sections = resolveAllSections(chain)
    const val = sections[name]
    return val === '' ? undefined : val
  }

  getSectionNames(): string[] {
    const chain = this._buildChain()
    const names = new Set<string>()
    for (const node of chain) {
      for (const k of Object.keys(node.config.sections)) names.add(k)
      for (const mixin of node.mixins) {
        for (const k of Object.keys(mixin.sections)) names.add(k)
      }
    }
    return Array.from(names)
  }

  getChain(): Array<{ name: string | undefined; prompt: Prompt }> {
    const result: Array<{ name: string | undefined; prompt: Prompt }> = []
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Prompt | null = this
    while (current !== null) {
      result.push({ name: current._config.name, prompt: current })
      current = current._parent
    }
    return result
  }

  inspect(): {
    name?: string
    chain: Array<{ name: string | undefined; depth: number }>
    resolvedSections: Record<string, string>
    variables: Record<string, unknown>
  } {
    const chain = this._buildChain()
    const chainInfo = this.getChain().map((entry, i) => ({
      name: entry.name,
      depth: i,
    }))
    return {
      name: this._config.name,
      chain: chainInfo,
      resolvedSections: resolveAllSections(chain),
      variables: { ...this._boundVariables },
    }
  }

  serialize(): object {
    return {
      name: this._config.name,
      config: this._config,
      mixins: this._mixins,
      boundVariables: this._boundVariables,
      boundSlots: this._boundSlots,
      parent: this._parent ? this._parent.serialize() : null,
    }
  }

  toJSON(): string {
    return JSON.stringify(this.serialize())
  }
}
