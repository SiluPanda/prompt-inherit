export type {
  MergeStrategy,
  SectionValue,
  OutputFormat,
  VariableDefinition,
  SlotDefinition,
  PromptConfig,
  ExtendOptions,
  MixinConfig,
  Mixin,
  PromptMessage,
  AnthropicPromptOutput,
  RenderOptions,
} from './types.js'

export { Prompt } from './prompt.js'

import type { PromptConfig, MixinConfig, Mixin } from './types.js'
import { Prompt } from './prompt.js'

export function definePrompt(config: PromptConfig): Prompt {
  return new Prompt(config, null, [], {}, {})
}

export function defineMixin(config: MixinConfig): Mixin {
  return {
    name: config.name,
    sections: config.sections,
    variables: config.variables ?? {},
    description: config.description,
  }
}

interface SerializedPrompt {
  name?: string
  config: PromptConfig
  mixins: Mixin[]
  boundVariables: Record<string, unknown>
  boundSlots: Record<string, string>
  parent: SerializedPrompt | null
}

export function loadPrompt(serialized: object): Prompt {
  const s = serialized as SerializedPrompt
  const parent = s.parent ? loadPrompt(s.parent) : null
  return new Prompt(s.config, parent, s.mixins ?? [], s.boundVariables ?? {}, s.boundSlots ?? {})
}
