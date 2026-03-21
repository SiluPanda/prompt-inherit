# prompt-inherit

Composable, inheritable prompt builder for AI/LLM applications. Zero runtime dependencies.

## Install

```bash
npm install prompt-inherit
```

## Quick Start

```typescript
import { definePrompt, defineMixin } from 'prompt-inherit'

const base = definePrompt({
  name: 'base',
  sections: {
    system: 'You are a helpful assistant.',
    constraints: 'Be concise and accurate.',
  },
  sectionOrder: ['system', 'constraints'],
})

const result = base.render()
// "You are a helpful assistant.\n\nBe concise and accurate."
```

## Extend

Child prompts inherit all sections from their parent chain.

```typescript
const specialized = base.extend({
  name: 'code-assistant',
  sections: {
    system: 'You are an expert TypeScript developer.',  // replace (default)
    context: { content: 'Focus on type safety.', strategy: 'append' },
  },
})

specialized.render()
// "You are an expert TypeScript developer.\n\nBe concise and accurate.\n\nFocus on type safety."
```

## Section Merge Strategies

Each section value can be a plain string (defaults to `replace`) or an object with an explicit strategy:

| Strategy  | Behavior |
|-----------|----------|
| `replace` | Child value overwrites parent (default) |
| `prepend` | Child value is placed before parent value |
| `append`  | Child value is placed after parent value |
| `remove`  | Section is removed from output |

```typescript
parent.extend({
  sections: {
    system:      'Replaces parent system',
    context:     { content: 'Added after parent context.', strategy: 'append' },
    constraints: { content: 'Added before parent constraints.', strategy: 'prepend' },
    examples:    { content: '', strategy: 'remove' },
  }
})
```

## Mixins

Mixins add reusable sections across multiple prompts.

```typescript
const safetyMixin = defineMixin({
  name: 'safety',
  sections: { safety: 'Never produce harmful content.' },
  description: 'Safety guardrails',
})

const safe = base.with(safetyMixin)
safe.render()
// includes 'Never produce harmful content.'
```

## Immutable Mutations

All mutation methods return new Prompt instances — the original is never changed.

```typescript
const p2 = prompt.override({ context: 'New context.' })   // returns new Prompt
const p3 = prompt.set({ userName: 'Alice' })              // returns new Prompt
```

## Variable Substitution

```typescript
const p = definePrompt({
  sections: { system: 'Hello, {{name}}! You are in {{mode}} mode.' },
})

p.render({ variables: { name: 'Alice', mode: 'strict' } })
// "Hello, Alice! You are in strict mode."
```

Supported patterns: `{{var}}`, `{var}`, `${var}`.

## Slot Substitution

Slots use `[[slotName]]` syntax and are filled via `extend({ slots: {...} })`.

```typescript
const template = definePrompt({
  sections: { system: 'Respond in [[language]].' },
})

const english = template.extend({ slots: { language: 'English' } })
english.render()  // "Respond in English."
```

## Render Formats

```typescript
// Plain string (default)
prompt.render()                         // string
prompt.render({ format: 'string' })     // string

// Chat messages array
prompt.render({ format: 'messages' })   // PromptMessage[]
prompt.toMessages()                     // PromptMessage[]

// Anthropic API format
prompt.render({ format: 'anthropic' })  // { system: string; messages: [{role,content}][] }

// Section map
prompt.render({ format: 'sections' })   // Record<string, string>
```

### Section-to-role mapping (messages/anthropic formats)

- `system`, `persona`, `constraints`, `safety`, `tools`, `context` → `role: 'system'`
- `examples` and all others → `role: 'user'`

## Filtering Sections

```typescript
prompt.render({ excludeSections: ['examples'] })
prompt.render({ includeSections: ['system', 'context'] })
```

## Inspect and Debug

```typescript
prompt.inspect()
// { name, chain: [{name, depth}], resolvedSections: {...}, variables: {...} }

prompt.getSection('system')     // resolved value for one section
prompt.getSectionNames()        // all section names across chain
prompt.getChain()               // [{name, prompt}] from child to root
prompt.depth                    // number of parents
```

## Serialize and Load

```typescript
const json = prompt.toJSON()
const restored = loadPrompt(JSON.parse(json))
restored.render()  // identical output
```

## API Reference

| Function / Method | Description |
|---|---|
| `definePrompt(config)` | Create a root prompt |
| `defineMixin(config)` | Create a reusable mixin |
| `loadPrompt(obj)` | Reconstruct a serialized prompt |
| `prompt.extend(opts)` | Create a child prompt |
| `prompt.with(mixin)` | Attach a mixin (immutable) |
| `prompt.override(sections)` | Patch sections (immutable) |
| `prompt.set(vars)` | Bind variables (immutable) |
| `prompt.render(opts?)` | Produce output |
| `prompt.toMessages(opts?)` | Shorthand for messages format |
| `prompt.inspect()` | Debug info |
| `prompt.serialize()` | Plain object representation |
| `prompt.toJSON()` | JSON string |

## License

MIT
