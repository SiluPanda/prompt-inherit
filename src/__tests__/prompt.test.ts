import { describe, it, expect } from 'vitest'
import {
  definePrompt,
  defineMixin,
  loadPrompt,
} from '../index.js'
import type { PromptMessage, AnthropicPromptOutput } from '../index.js'

describe('definePrompt', () => {
  it('creates a Prompt with sections, render as string', () => {
    const p = definePrompt({
      sections: { system: 'You are a helpful assistant.', context: 'Answer concisely.' },
      sectionOrder: ['system', 'context'],
    })
    const result = p.render()
    expect(typeof result).toBe('string')
    expect(result).toContain('You are a helpful assistant.')
    expect(result).toContain('Answer concisely.')
  })

  it('render() default separator is double newline', () => {
    const p = definePrompt({
      sections: { a: 'Hello', b: 'World' },
      sectionOrder: ['a', 'b'],
    })
    expect(p.render()).toBe('Hello\n\nWorld')
  })

  it('custom sectionSeparator', () => {
    const p = definePrompt({
      sections: { a: 'Hello', b: 'World' },
      sectionOrder: ['a', 'b'],
      sectionSeparator: '\n---\n',
    })
    expect(p.render()).toBe('Hello\n---\nWorld')
  })
})

describe('extend()', () => {
  it('creates a child that inherits parent sections', () => {
    const parent = definePrompt({
      name: 'parent',
      sections: { system: 'Base system prompt.' },
    })
    const child = parent.extend({
      name: 'child',
      sections: {},
    })
    const result = child.render() as string
    expect(result).toContain('Base system prompt.')
  })

  it('replace strategy (default for string) overwrites parent section', () => {
    const parent = definePrompt({
      name: 'parent',
      sections: { system: 'Original system.' },
    })
    const child = parent.extend({
      name: 'child',
      sections: { system: 'Overridden system.' },
    })
    const result = child.render() as string
    expect(result).toContain('Overridden system.')
    expect(result).not.toContain('Original system.')
  })

  it('append strategy appends child content after parent', () => {
    const parent = definePrompt({
      name: 'parent',
      sections: { system: 'Base rules.' },
    })
    const child = parent.extend({
      name: 'child',
      sections: { system: { content: 'Additional rules.', strategy: 'append' } },
    })
    const result = child.render() as string
    expect(result).toContain('Base rules.')
    expect(result).toContain('Additional rules.')
    const idx1 = result.indexOf('Base rules.')
    const idx2 = result.indexOf('Additional rules.')
    expect(idx1).toBeLessThan(idx2)
  })

  it('prepend strategy prepends child content before parent', () => {
    const parent = definePrompt({
      name: 'parent',
      sections: { system: 'Base rules.' },
    })
    const child = parent.extend({
      name: 'child',
      sections: { system: { content: 'Preamble.', strategy: 'prepend' } },
    })
    const result = child.render() as string
    expect(result).toContain('Base rules.')
    expect(result).toContain('Preamble.')
    const idx1 = result.indexOf('Preamble.')
    const idx2 = result.indexOf('Base rules.')
    expect(idx1).toBeLessThan(idx2)
  })

  it('remove strategy removes the section', () => {
    const parent = definePrompt({
      name: 'parent',
      sections: { system: 'Base system.', context: 'Some context.' },
    })
    const child = parent.extend({
      name: 'child',
      sections: { context: { content: '', strategy: 'remove' } },
    })
    const result = child.render() as string
    expect(result).not.toContain('Some context.')
    expect(result).toContain('Base system.')
  })

  it('extend() does not mutate parent', () => {
    const parent = definePrompt({ sections: { system: 'Parent.' } })
    parent.extend({ sections: { system: 'Child.' } })
    expect(parent.render()).toContain('Parent.')
  })

  it('multi-level chain resolves correctly', () => {
    const root = definePrompt({ name: 'root', sections: { system: 'Root.' } })
    const mid = root.extend({ name: 'mid', sections: { context: 'Mid context.' } })
    const leaf = mid.extend({ name: 'leaf', sections: { examples: 'Leaf example.' } })
    const result = leaf.render() as string
    expect(result).toContain('Root.')
    expect(result).toContain('Mid context.')
    expect(result).toContain('Leaf example.')
  })
})

describe('with() mixin', () => {
  it('adds mixin sections to prompt output', () => {
    const safetyMixin = defineMixin({
      name: 'safety',
      sections: { safety: 'Never harm users.' },
    })
    const p = definePrompt({ sections: { system: 'You are helpful.' } }).with(safetyMixin)
    const result = p.render() as string
    expect(result).toContain('Never harm users.')
    expect(result).toContain('You are helpful.')
  })

  it('mixin does not mutate original prompt', () => {
    const mixin = defineMixin({ name: 'extra', sections: { context: 'Extra context.' } })
    const original = definePrompt({ sections: { system: 'Base.' } })
    original.with(mixin)
    const result = original.render() as string
    expect(result).not.toContain('Extra context.')
  })

  it('mixin sections use merge strategy on child extending parent', () => {
    // The mixin uses append, so it appends to the parent's section value.
    // Attach the mixin to a child that extends a parent owning 'Original.'
    const appendMixin = defineMixin({
      name: 'append-mixin',
      sections: { system: { content: 'Appended by mixin.', strategy: 'append' } },
    })
    const parent = definePrompt({ sections: { system: 'Original.' } })
    // Child has no own system section, so the mixin's append runs against parent's value
    const child = parent.extend({ sections: {} }).with(appendMixin)
    const result = child.render() as string
    expect(result).toContain('Original.')
    expect(result).toContain('Appended by mixin.')
  })
})

describe('override()', () => {
  it('updates sections immutably', () => {
    const p = definePrompt({ sections: { system: 'Original.' } })
    const p2 = p.override({ system: 'Overridden.' })
    expect(p.render()).toContain('Original.')
    expect(p2.render()).toContain('Overridden.')
  })

  it('can add new sections via override', () => {
    const p = definePrompt({ sections: { system: 'Base.' } })
    const p2 = p.override({ context: 'New context.' })
    expect(p2.render() as string).toContain('New context.')
  })
})

describe('set() variable binding', () => {
  it('substitutes variables in render output', () => {
    const p = definePrompt({ sections: { system: 'Hello, {{name}}!' } }).set({ name: 'Alice' })
    expect(p.render()).toBe('Hello, Alice!')
  })

  it('options.variables override bound variables', () => {
    const p = definePrompt({ sections: { system: 'Hello, {{name}}!' } }).set({ name: 'Alice' })
    expect(p.render({ variables: { name: 'Bob' } })).toBe('Hello, Bob!')
  })

  it('set() is immutable', () => {
    const p = definePrompt({ sections: { system: 'Hello, {{name}}!' } })
    p.set({ name: 'Alice' })
    expect(p.render()).toBe('Hello, {{name}}!')
  })

  it('substitutes {varName} and ${varName} patterns', () => {
    const p = definePrompt({ sections: { system: '{a} and ${b}' } })
    expect(p.render({ variables: { a: 'X', b: 'Y' } })).toBe('X and Y')
  })

  it('leaves unknown variables intact', () => {
    const p = definePrompt({ sections: { system: 'Hello, {{name}}!' } })
    expect(p.render()).toBe('Hello, {{name}}!')
  })

  it('JSON-stringifies non-string variable values', () => {
    const p = definePrompt({ sections: { system: '{{config}}' } })
    expect(p.render({ variables: { config: { key: 'value' } } })).toBe('{"key":"value"}')
  })
})

describe('slot substitution', () => {
  it('substitutes [[slotName]] patterns', () => {
    const p = definePrompt({
      sections: { system: 'Language: [[lang]]' },
    }).extend({ slots: { lang: 'English' } })
    expect(p.render()).toContain('Language: English')
  })

  it('leaves unknown slots intact', () => {
    const p = definePrompt({ sections: { system: 'Language: [[lang]]' } })
    expect(p.render()).toBe('Language: [[lang]]')
  })
})

describe('getChain()', () => {
  it('returns correct depth for single prompt', () => {
    const p = definePrompt({ name: 'root', sections: { system: 'Root.' } })
    const chain = p.getChain()
    expect(chain).toHaveLength(1)
    expect(chain[0].name).toBe('root')
    expect(p.depth).toBe(0)
  })

  it('returns chain with parent and child', () => {
    const parent = definePrompt({ name: 'parent', sections: { system: 'Parent.' } })
    const child = parent.extend({ name: 'child', sections: {} })
    const chain = child.getChain()
    expect(chain).toHaveLength(2)
    expect(chain[0].name).toBe('child')
    expect(chain[1].name).toBe('parent')
    expect(child.depth).toBe(1)
  })

  it('three-level chain has correct depth', () => {
    const root = definePrompt({ name: 'root', sections: {} })
    const mid = root.extend({ name: 'mid', sections: {} })
    const leaf = mid.extend({ name: 'leaf', sections: {} })
    expect(leaf.depth).toBe(2)
    expect(leaf.getChain()).toHaveLength(3)
  })
})

describe("render format='messages'", () => {
  it('returns PromptMessage array', () => {
    const p = definePrompt({
      sections: { system: 'You are helpful.', examples: 'Example usage.' },
      sectionOrder: ['system', 'examples'],
    })
    const result = p.render({ format: 'messages' }) as PromptMessage[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    const systemMsg = result.find((m) => m.role === 'system')
    expect(systemMsg).toBeDefined()
    expect(systemMsg?.content).toContain('You are helpful.')
  })

  it('groups consecutive same-role sections', () => {
    const p = definePrompt({
      sections: { system: 'System.', persona: 'Persona.', examples: 'Examples.' },
      sectionOrder: ['system', 'persona', 'examples'],
    })
    const result = p.render({ format: 'messages' }) as PromptMessage[]
    // system and persona both map to 'system' role → should be grouped
    const systemMsgs = result.filter((m) => m.role === 'system')
    expect(systemMsgs).toHaveLength(1)
    expect(systemMsgs[0].content).toContain('System.')
    expect(systemMsgs[0].content).toContain('Persona.')
  })

  it('toMessages() is equivalent to render messages', () => {
    const p = definePrompt({ sections: { system: 'Hello.' } })
    const a = p.toMessages()
    const b = p.render({ format: 'messages' }) as PromptMessage[]
    expect(a).toEqual(b)
  })
})

describe("render format='anthropic'", () => {
  it('returns { system, messages }', () => {
    const p = definePrompt({
      sections: { system: 'You are helpful.', examples: 'Example.' },
      sectionOrder: ['system', 'examples'],
    })
    const result = p.render({ format: 'anthropic' }) as AnthropicPromptOutput
    expect(typeof result.system).toBe('string')
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.system).toContain('You are helpful.')
  })

  it('user sections go into messages', () => {
    const p = definePrompt({
      sections: { examples: 'Example content.' },
    })
    const result = p.render({ format: 'anthropic' }) as AnthropicPromptOutput
    expect(result.messages.length).toBeGreaterThan(0)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].content).toContain('Example content.')
  })
})

describe("render format='sections'", () => {
  it('returns object with non-empty sections', () => {
    const p = definePrompt({
      sections: { system: 'System.', context: '' },
    })
    const result = p.render({ format: 'sections' }) as Record<string, string>
    expect(typeof result).toBe('object')
    expect(result.system).toBe('System.')
    expect(result.context).toBeUndefined()
  })
})

describe('render options: includeSections / excludeSections', () => {
  it('excludeSections removes specified sections', () => {
    const p = definePrompt({
      sections: { system: 'System.', context: 'Context.' },
      sectionOrder: ['system', 'context'],
    })
    const result = p.render({ excludeSections: ['context'] }) as string
    expect(result).toContain('System.')
    expect(result).not.toContain('Context.')
  })

  it('includeSections restricts to specified sections', () => {
    const p = definePrompt({
      sections: { system: 'System.', context: 'Context.', examples: 'Examples.' },
      sectionOrder: ['system', 'context', 'examples'],
    })
    const result = p.render({ includeSections: ['system'] }) as string
    expect(result).toContain('System.')
    expect(result).not.toContain('Context.')
    expect(result).not.toContain('Examples.')
  })
})

describe('inspect()', () => {
  it('returns resolvedSections, name, variables', () => {
    const p = definePrompt({ name: 'test', sections: { system: 'Hello.' } }).set({ foo: 'bar' })
    const info = p.inspect()
    expect(info.name).toBe('test')
    expect(info.resolvedSections.system).toBe('Hello.')
    expect(info.variables.foo).toBe('bar')
    expect(Array.isArray(info.chain)).toBe(true)
  })
})

describe('getSection() and getSectionNames()', () => {
  it('getSection returns value for known section', () => {
    const p = definePrompt({ sections: { system: 'Hello.' } })
    expect(p.getSection('system')).toBe('Hello.')
  })

  it('getSection returns undefined for unknown section', () => {
    const p = definePrompt({ sections: { system: 'Hello.' } })
    expect(p.getSection('nonexistent')).toBeUndefined()
  })

  it('getSectionNames returns all section names', () => {
    const p = definePrompt({ sections: { system: 'Hello.', context: 'Ctx.' } })
    const names = p.getSectionNames()
    expect(names).toContain('system')
    expect(names).toContain('context')
  })
})

describe('serialize() and loadPrompt()', () => {
  it('serialize returns plain object', () => {
    const p = definePrompt({ name: 'root', sections: { system: 'Hello.' } })
    const serialized = p.serialize()
    expect(typeof serialized).toBe('object')
  })

  it('toJSON returns JSON string', () => {
    const p = definePrompt({ sections: { system: 'Hello.' } })
    const json = p.toJSON()
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed).toBeDefined()
  })

  it('loadPrompt reconstructs a Prompt that renders correctly', () => {
    const original = definePrompt({ name: 'root', sections: { system: 'Hello from root.' } })
    const serialized = original.serialize()
    const loaded = loadPrompt(serialized)
    expect(loaded.render()).toContain('Hello from root.')
    expect(loaded.name).toBe('root')
  })

  it('loadPrompt reconstructs parent chain', () => {
    const parent = definePrompt({ name: 'parent', sections: { system: 'Parent.' } })
    const child = parent.extend({ name: 'child', sections: {} })
    const loaded = loadPrompt(child.serialize())
    expect(loaded.depth).toBe(1)
    expect((loaded.render() as string)).toContain('Parent.')
  })
})

describe('defineMixin()', () => {
  it('creates a mixin with required fields', () => {
    const mixin = defineMixin({
      name: 'my-mixin',
      sections: { safety: 'Be safe.' },
      description: 'Safety mixin',
    })
    expect(mixin.name).toBe('my-mixin')
    expect(mixin.sections.safety).toBe('Be safe.')
    expect(mixin.variables).toEqual({})
    expect(mixin.description).toBe('Safety mixin')
  })
})

describe('regression: includeSections empty array', () => {
  it('returns empty string when includeSections is an empty array', () => {
    const p = definePrompt({
      sections: { a: 'Alpha', b: 'Beta' },
    })
    const result = p.render({ includeSections: [] })
    expect(result).toBe('')
  })
})

describe('regression: mixin append on existing section', () => {
  it('mixin with append strategy adds to existing section content', () => {
    const mixin = defineMixin({
      name: 'append-mixin',
      sections: { instructions: { content: 'Extra rule.', strategy: 'append' } },
    })
    const p = definePrompt({
      sections: { instructions: 'Base rules.' },
    }).with(mixin)
    const result = p.render() as string
    expect(result).toContain('Base rules.')
    expect(result).toContain('Extra rule.')
  })

  it('mixin with prepend strategy prepends to existing section', () => {
    const mixin = defineMixin({
      name: 'prepend-mixin',
      sections: { instructions: { content: 'First.', strategy: 'prepend' } },
    })
    const p = definePrompt({
      sections: { instructions: 'Second.' },
    }).with(mixin)
    const result = p.render() as string
    expect(result).toContain('First.')
    expect(result).toContain('Second.')
    expect(result.indexOf('First.')).toBeLessThan(result.indexOf('Second.'))
  })
})

describe('regression: invalid format falls back to string', () => {
  it('returns a string for unrecognized format', () => {
    const p = definePrompt({ sections: { a: 'Hello' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = p.render({ format: 'invalid' as any })
    expect(typeof result).toBe('string')
    expect(result).toContain('Hello')
  })
})
