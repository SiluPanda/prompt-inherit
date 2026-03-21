import type { PromptMessage, AnthropicPromptOutput } from './types.js'

const DEFAULT_SYSTEM_SECTIONS = new Set([
  'system',
  'persona',
  'constraints',
  'safety',
  'tools',
  'context',
])
const DEFAULT_USER_SECTIONS = new Set(['examples'])

function sectionRole(name: string): 'system' | 'user' {
  if (DEFAULT_SYSTEM_SECTIONS.has(name)) return 'system'
  if (DEFAULT_USER_SECTIONS.has(name)) return 'user'
  return 'user'
}

export function renderToString(
  sections: Record<string, string>,
  order: string[],
  separator: string
): string {
  const parts: string[] = []
  for (const name of order) {
    const content = sections[name]
    if (content !== undefined && content !== '') {
      parts.push(content)
    }
  }
  return parts.join(separator)
}

export function renderToMessages(
  sections: Record<string, string>,
  order: string[]
): PromptMessage[] {
  const messages: PromptMessage[] = []
  let current: PromptMessage | null = null

  for (const name of order) {
    const content = sections[name]
    if (!content || content === '') continue

    const role = sectionRole(name)
    if (current && current.role === role) {
      current.content += '\n\n' + content
    } else {
      current = { role, content }
      messages.push(current)
    }
  }

  return messages
}

export function renderToAnthropic(
  sections: Record<string, string>,
  order: string[]
): AnthropicPromptOutput {
  const messages = renderToMessages(sections, order)
  const systemParts: string[] = []
  const userParts: string[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content)
    } else {
      userParts.push(msg.content)
    }
  }

  const result: AnthropicPromptOutput = {
    system: systemParts.join('\n\n'),
    messages: [],
  }

  if (userParts.length > 0) {
    result.messages.push({ role: 'user', content: userParts.join('\n\n') })
  }

  return result
}

export function renderToSections(sections: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(sections)) {
    if (val !== undefined && val !== '') {
      result[key] = val
    }
  }
  return result
}
