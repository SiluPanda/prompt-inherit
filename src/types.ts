export type MergeStrategy = 'replace' | 'prepend' | 'append' | 'remove'
export type SectionValue = string | { content: string; strategy: MergeStrategy }
export type OutputFormat = 'string' | 'messages' | 'anthropic' | 'sections'

export interface VariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  default?: unknown
  description?: string
}

export interface SlotDefinition {
  default?: string
  description?: string
}

export interface PromptConfig {
  name?: string
  sections: Record<string, SectionValue>
  variables?: Record<string, VariableDefinition>
  slots?: Record<string, SlotDefinition>
  sectionOrder?: string[]
  sectionSeparator?: string
  metadata?: Record<string, unknown>
}

export interface ExtendOptions {
  name?: string
  sections?: Record<string, SectionValue>
  variables?: Record<string, VariableDefinition>
  slots?: Record<string, string>
  sectionOrder?: string[]
  metadata?: Record<string, unknown>
}

export interface MixinConfig {
  name: string
  sections: Record<string, SectionValue>
  variables?: Record<string, VariableDefinition>
  description?: string
}

export interface Mixin {
  name: string
  sections: Record<string, SectionValue>
  variables: Record<string, VariableDefinition>
  description?: string
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AnthropicPromptOutput {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface RenderOptions {
  format?: OutputFormat
  variables?: Record<string, unknown>
  excludeSections?: string[]
  includeSections?: string[]
  sectionSeparator?: string
}
