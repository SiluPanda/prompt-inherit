export function substituteVariables(text: string, variables: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}|\{(\w+)\}|\$\{(\w+)\}/g, (_match, n1, n2, n3) => {
    const name = n1 ?? n2 ?? n3
    if (name === undefined) return _match
    if (!(name in variables)) return _match
    const val = variables[name]
    if (val === null || val === undefined) return _match
    if (typeof val === 'string') return val
    return JSON.stringify(val)
  })
}

export function substituteSlots(text: string, slots: Record<string, string>): string {
  return text.replace(/\[\[(\w+)\]\]/g, (_match, name: string) => {
    if (!(name in slots)) return _match
    return slots[name]
  })
}
