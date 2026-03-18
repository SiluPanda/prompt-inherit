# prompt-inherit — Task Breakdown

This document contains all tasks required to implement `prompt-inherit` per the SPEC.md. Tasks are grouped by phase and ordered by dependency. Each task maps to specific spec sections.

---

## Phase 1: Project Scaffolding and Core Types

- [ ] **Install dev dependencies** — Add `typescript`, `vitest`, and `eslint` as dev dependencies. Verify `npm run build`, `npm run test`, and `npm run lint` commands work with the existing `package.json` scripts. | Status: not_done

- [ ] **Define all TypeScript types in `src/types.ts`** — Create the types file with all type definitions from spec section 7: `MergeStrategy`, `SectionValue`, `BuiltInSectionName`, `SectionDefinitions`, `VariableDefinition`, `SlotDefinition`, `PromptConfig<TVars>`, `ExtendOptions<TVars>`, `MixinConfig<TVars>`, `Mixin`, `OutputFormat`, `RoleMapping`, `RenderOptions`, `PromptMessage`, `AnthropicPromptOutput`, `RenderResult<F>`, `InspectionResult`, `SerializedPrompt`. Ensure generic type parameters match the spec exactly. | Status: not_done

- [ ] **Define error classes in `src/errors.ts`** — Implement `PromptValidationError` with an `issues` array (each with `type`, `variableName`, `message` fields) and `PromptCycleError` with a `chain` string array. Both extend `Error`. | Status: not_done

- [ ] **Create utility functions in `src/utils/text.ts`** — Implement regex patterns for template variables (`{{variableName}}`), slot references (`{{slot:slotName}}` and `{{slot:slotName|default}}`), and a `joinWithSeparator` function for combining section content strings with a configurable delimiter. | Status: not_done

- [ ] **Create merge utility in `src/utils/merge.ts`** — Implement `applyStrategy(existing: string | null | undefined, incoming: SectionValue, separator: string): string | null` that handles all four merge strategies: `replace` returns incoming content, `prepend` puts incoming before existing, `append` puts incoming after existing, `remove` returns null. Default strategy when not specified is `replace`. | Status: not_done

- [ ] **Create global config module in `src/config.ts`** — Implement the `configure()` function and a module-level config store holding defaults: `defaultSectionSeparator` ('\n\n'), `defaultWrapSections` (false), `defaultFormat` ('string'), `defaultRoleMapping` (system sections and user sections per spec section 7). Export a `getConfig()` function to read current global defaults. | Status: not_done

- [ ] **Set up `src/index.ts` barrel exports** — Export all public API symbols: `definePrompt`, `defineMixin`, `loadPrompt`, `loadPromptFromJSON`, `loadPromptFromYAML`, `configure`, all types, and error classes. Update incrementally as implementations are added. | Status: not_done

---

## Phase 2: Core Prompt — definePrompt and Prompt Class Shell

- [ ] **Implement `definePrompt()` in `src/define-prompt.ts`** — Factory function that validates a `PromptConfig`, normalizes section values (plain strings become `{ content, strategy: 'replace' }`), validates `sectionOrder` references existing sections, and returns a new `Prompt` instance with `parent: null` and `depth: 0`. | Status: not_done

- [ ] **Implement Prompt class shell in `src/prompt.ts`** — Create the `Prompt<TVars>` class with readonly properties: `name`, `parent`, `depth`. Store internal state: own section definitions (normalized), variable declarations, slot declarations, applied mixins list, bound variable values, section order, section separator, and metadata. All mutation methods (`.extend()`, `.with()`, `.override()`, `.set()`) must return new `Prompt` instances without modifying the original (immutability). | Status: not_done

- [ ] **Implement `Prompt.extend()` method** — Create a child `Prompt` whose parent is `this`. Accept `ExtendOptions` with sections, variables, slots, sectionOrder, metadata, and `freeze` flag. Merge metadata (child wins on conflicts). When `freeze: true`, copy the parent's resolved sections into the child at extend time, severing the live reference. Run cycle detection before returning the child. | Status: not_done

- [ ] **Implement `Prompt.override()` method** — Syntactic sugar for `.extend({ sections: overrides })`. Returns a new Prompt that is a child of the current prompt with only the specified section overrides applied. | Status: not_done

- [ ] **Implement `Prompt.with()` method** — Apply a `Mixin` to the current prompt. Returns a new `Prompt` instance with the mixin added to its applied mixins list. The original prompt is not modified. Multiple `.with()` calls chain — later mixins have higher priority than earlier ones. | Status: not_done

---

## Phase 3: Resolution Algorithm

- [ ] **Implement chain walker in `src/resolver/chain-walker.ts`** — Build the inheritance chain array by walking parent references from self to root: `[self, parent, grandparent, ..., root]`. Detect cycles by tracking visited prompt references; throw `PromptCycleError` if a cycle is found. | Status: not_done

- [ ] **Implement section resolver in `src/resolver/section-resolver.ts`** — For each section name, walk the chain from root to self (reverse order), applying merge strategies at each level. At each level, first apply the prompt's own section definition, then apply each mixin's section definition in application order. Use `applyStrategy()` from utils/merge.ts. Return a `Record<string, string | null>` mapping section names to resolved content (null means removed). | Status: not_done

- [ ] **Implement section enumeration** — Collect the union of all section names across the entire chain (including all mixin sections at every level). This determines which sections will appear in the output. | Status: not_done

- [ ] **Implement section ordering logic** — Resolve the final section order: if an explicit `sectionOrder` is provided (prompt-level or render-level), use it. Otherwise, use the default built-in order (persona, context, system, constraints, tools, safety, outputFormat, examples) followed by custom sections in first-definition order. Sections not in the order list are appended at the end. | Status: not_done

- [ ] **Implement resolution entry point in `src/resolver/index.ts`** — Orchestrate the five resolution phases: (1) chain collection, (2) section enumeration, (3) per-section resolution, (4) slot filling, (5) variable substitution. Return the fully resolved sections ready for rendering. | Status: not_done

- [ ] **Wire `Prompt.getSection()` method** — Resolve a single section by running the full chain resolution for that section name. Return the final content string, or `undefined` if the section does not exist or was removed. | Status: not_done

- [ ] **Wire `Prompt.getSectionNames()` method** — Return all resolved section names (excluding removed sections) in rendering order. | Status: not_done

- [ ] **Wire `Prompt.getChain()` method** — Return the inheritance chain as an array of `{ name, prompt }` objects. | Status: not_done

---

## Phase 4: Merge Strategy Tests

- [ ] **Test `replace` merge strategy** — Two-level chain where child replaces parent section. Verify parent content is completely replaced by child content. | Status: not_done

- [ ] **Test `prepend` merge strategy** — Two-level chain where child prepends to parent section. Verify child content appears before parent content, separated by the configured delimiter. | Status: not_done

- [ ] **Test `append` merge strategy** — Two-level chain where child appends to parent section. Verify child content appears after parent content, separated by the configured delimiter. | Status: not_done

- [ ] **Test `remove` merge strategy** — Two-level chain where child removes a parent section. Verify the section is excluded from the final output. | Status: not_done

- [ ] **Test default strategy (no explicit strategy)** — When child defines a section as a plain string (no `{ content, strategy }` object), verify it defaults to `replace`. | Status: not_done

- [ ] **Test merge strategies with `undefined` existing content** — When a strategy is `prepend` or `append` but no parent defines the section, verify the content is used as-is (no separator artifacts). | Status: not_done

- [ ] **Test deep chain resolution (3+ levels)** — Test a 3-level chain where a section is defined at root, overridden at level 1, and overridden again at level 2 with different strategies. Verify the accumulated result is correct. | Status: not_done

- [ ] **Test section inherited through multiple levels** — Test a section defined only at the root that passes through 3 child levels without override. Verify it is inherited unchanged. | Status: not_done

- [ ] **Test mixed strategies in a chain** — Test a chain where level 1 appends to root, level 2 prepends to the accumulated result. Verify the final ordering: level 2 content, root content, level 1 content. | Status: not_done

---

## Phase 5: Variable System

- [ ] **Implement variable declaration and inheritance in Prompt** — Store variable declarations in each Prompt. When extending, merge parent's variable declarations with child's (child can add new vars, override defaults, change required status). Validate that variable types are not changed by children (string stays string). Throw at extend time if type mismatch is detected. | Status: not_done

- [ ] **Implement `Prompt.set()` method** — Return a new Prompt with the given variable values merged into the bound values map. Later `.set()` calls override earlier bindings for the same variable. Validate bound value types at set time (runtime typeof check). | Status: not_done

- [ ] **Implement variable substitutor in `src/resolver/variable-substitutor.ts`** — Scan resolved section content for `{{variableName}}` patterns. Replace each occurrence with the bound value, converting types per spec: string as-is, number via `String()`, boolean as `'true'`/`'false'`, object/array via `JSON.stringify(value, null, 2)`. | Status: not_done

- [ ] **Implement variable validator in `src/resolver/variable-validator.ts`** — At render time (when `partial` is false), validate: (1) all required variables without defaults have been bound, (2) bound values match declared types, (3) no `{{variableName}}` references in section content reference undeclared variables. Collect all issues and throw a single `PromptValidationError` listing them all. | Status: not_done

- [ ] **Implement variable resolution order** — Values resolve in order: (1) declaration default, (2) child declaration default override, (3) `.set()` on parent, (4) `.set()` on child, (5) `.render({ variables })`. Later sources override earlier. | Status: not_done

- [ ] **Add TypeScript generics for compile-time variable type safety** — Ensure `TVars` generic parameter flows through `definePrompt`, `.extend()`, `.with()`, and `.set()` so that TypeScript enforces correct variable names and value types at compile time. | Status: not_done

---

## Phase 6: Variable System Tests

- [ ] **Test variable declaration in `definePrompt()`** — Declare variables with different types (string, number, boolean, object, array), required/optional flags, and defaults. Verify they are stored correctly. | Status: not_done

- [ ] **Test variable inheritance from parent to child** — Parent declares variables; child extends without redeclaring. Verify child inherits all parent variables. | Status: not_done

- [ ] **Test adding new variables in child** — Child extends parent and adds new variable declarations not in the parent. Verify both parent and child variables are present. | Status: not_done

- [ ] **Test overriding variable defaults in child** — Parent declares `maxWords` with default 200; child redeclares with default 150. Verify child's default is used. | Status: not_done

- [ ] **Test variable type mismatch rejection** — Parent declares `role` as string; child attempts to redeclare as number. Verify an error is thrown at extend time. | Status: not_done

- [ ] **Test `.set()` with valid values** — Bind variables and verify they are stored. Verify `.set()` returns a new instance (immutability). | Status: not_done

- [ ] **Test `.set()` with type mismatches** — Attempt to bind a number to a string variable. Verify runtime error is thrown. | Status: not_done

- [ ] **Test incremental `.set()` calls** — Call `.set({ role: 'x' })` then `.set({ language: 'en' })`. Verify both bindings are present. Verify that a second `.set({ role: 'y' })` overrides the first. | Status: not_done

- [ ] **Test variable substitution in rendered output** — Define a section with `{{role}}` and bind `role` via `.set()`. Render and verify substitution. Test all five types (string, number, boolean, object, array). | Status: not_done

- [ ] **Test render-time variable overrides** — Bind `role` via `.set()`, then provide a different `role` in `.render({ variables: { role: 'override' } })`. Verify render-time value wins. | Status: not_done

- [ ] **Test missing required variable throws PromptValidationError** — Declare a required variable with no default, do not bind it, and call `.render()`. Verify `PromptValidationError` is thrown with the correct issue. | Status: not_done

- [ ] **Test `partial: true` leaves unbound variables as-is** — Render with `partial: true` and unbound variables. Verify `{{variableName}}` appears literally in the output. | Status: not_done

- [ ] **Test undeclared variable reference detection** — Section content references `{{unknownVar}}` that is not declared. Verify `PromptValidationError` is thrown on render (when `partial` is false). | Status: not_done

- [ ] **Test variable with same name in multiple sections** — Declare `role` and use `{{role}}` in both `persona` and `constraints` sections. Bind once, verify substitution occurs in both sections. | Status: not_done

---

## Phase 7: Mixin System

- [ ] **Implement `defineMixin()` in `src/mixin.ts`** — Factory function that validates a `MixinConfig` (name is required), normalizes section values, and returns an immutable `Mixin` object with readonly `name`, `sections`, `variables`, and `description` properties. | Status: not_done

- [ ] **Implement mixin application order in resolution** — When resolving sections, at each level of the chain, apply the prompt's own sections first, then apply mixins in application order (first applied = lowest priority, last applied = highest priority). For `replace` strategy, last mixin wins. For `append`, content accumulates in application order. For `prepend`, content accumulates in reverse application order (last applied is outermost). | Status: not_done

- [ ] **Implement mixin variable merging** — When a mixin is applied via `.with()`, merge the mixin's variable declarations into the prompt's variable declarations. Mixin variables that conflict with existing variables follow the same rules as child variable overrides. | Status: not_done

---

## Phase 8: Mixin System Tests

- [ ] **Test `defineMixin()` creation** — Create a mixin with name, description, sections, and variables. Verify all properties are set and readonly. | Status: not_done

- [ ] **Test single mixin application** — Apply one mixin to a base prompt via `.with()`. Verify the mixin's sections are merged with the prompt's sections per the merge strategies. | Status: not_done

- [ ] **Test multiple mixin application order** — Apply three mixins in order. Verify that for `replace` strategy, the last mixin wins. For `append` strategy, content accumulates in application order. | Status: not_done

- [ ] **Test mixin with `prepend` strategy** — Apply a mixin that prepends to a section. Verify content ordering. | Status: not_done

- [ ] **Test mixin with `remove` strategy** — Apply a mixin that removes a section defined in the prompt. Verify the section is excluded from output. | Status: not_done

- [ ] **Test mixin + inheritance interaction** — Parent has mixins, child has different mixins. Verify resolution order: parent sections, parent mixins, child sections, child mixins. | Status: not_done

- [ ] **Test mixin immutability** — Verify `.with()` returns a new Prompt and the original prompt is unmodified. | Status: not_done

- [ ] **Test mixin with variables** — Mixin declares new variables. Verify they are merged into the prompt's variable declarations after `.with()`. | Status: not_done

---

## Phase 9: Slot System

- [ ] **Implement slot definition in `definePrompt()`** — Parse `slots` config and store slot declarations (name, default, description) on the Prompt. | Status: not_done

- [ ] **Implement slot filling in `.extend()`** — When extending, accept `slots` map in `ExtendOptions` that provides fill values for parent slots. Store slot fills on the child Prompt. | Status: not_done

- [ ] **Implement slot filler in `src/resolver/slot-filler.ts`** — After section resolution but before variable substitution, scan resolved section content for `{{slot:slotName}}` and `{{slot:slotName|default}}` patterns. Walk the chain from self to root collecting slot fill values. Substitute filled slots. Use default value if no fill exists. Leave unfilled slots with no default as literal text. | Status: not_done

---

## Phase 10: Slot System Tests

- [ ] **Test slot definition and filling** — Define a parent with `{{slot:taskInstructions}}` in a section. Extend with `slots: { taskInstructions: 'Analyze data.' }`. Render and verify the slot is filled. | Status: not_done

- [ ] **Test unfilled slot with default** — Define `{{slot:greeting|Hello!}}` in a section. Do not fill the slot. Verify default "Hello!" is used in output. | Status: not_done

- [ ] **Test unfilled slot without default** — Define `{{slot:taskInstructions}}` with no default and no fill. Verify the literal `{{slot:taskInstructions}}` appears in the output. | Status: not_done

- [ ] **Test slot filling through multiple inheritance levels** — Grandparent defines a slot, parent does not fill it, grandchild fills it. Verify the fill value from grandchild is used. | Status: not_done

- [ ] **Test slot and variable coexistence** — Section content contains both `{{slot:task}}` and `{{role}}`. Verify slots are filled first, then variables are substituted. | Status: not_done

---

## Phase 11: Renderers — String Format

- [ ] **Implement string renderer in `src/renderer/string-renderer.ts`** — Join resolved sections (excluding null/removed sections) with the section separator (default `\n\n`), in section order. Return a single string. | Status: not_done

- [ ] **Implement XML section wrapping** — When `wrapSections: true`, wrap each section's content in `<sectionName>\n...\n</sectionName>` tags before joining with separator. | Status: not_done

- [ ] **Implement `excludeSections` and `includeSections` filtering** — If `includeSections` is provided, only render those sections. If `excludeSections` is provided, exclude those sections. `includeSections` takes precedence if both are specified. | Status: not_done

- [ ] **Wire `Prompt.render()` for string format** — Default format. Calls the resolution pipeline then the string renderer. Returns a string. | Status: not_done

---

## Phase 12: Renderers — Message Formats

- [ ] **Implement messages renderer in `src/renderer/messages-renderer.ts`** — Produce an OpenAI-style `{role, content}[]` array. Use the role mapping (default or custom) to determine which sections go into which role. Sections mapped to the same role are concatenated with section separators into a single message for that role. System sections produce a system message; user sections produce a user message. | Status: not_done

- [ ] **Implement Anthropic renderer in `src/renderer/anthropic-renderer.ts`** — Produce `{ system: string, messages: [{role, content}] }`. System-role sections go into the `system` field. Other sections go into the `messages` array as user messages. | Status: not_done

- [ ] **Implement sections renderer in `src/renderer/sections-renderer.ts`** — Return the resolved sections as a plain `Record<string, string>` object. Exclude null/removed sections. Variables and slots are substituted. | Status: not_done

- [ ] **Implement renderer dispatcher in `src/renderer/index.ts`** — Based on the `format` option in `RenderOptions`, dispatch to the correct renderer: string, messages, anthropic, or sections. | Status: not_done

- [ ] **Wire `Prompt.toMessages()` method** — Shorthand for `.render({ format: 'messages' })`. Accepts `Omit<RenderOptions, 'format'>`. Returns `PromptMessage[]`. | Status: not_done

---

## Phase 13: Renderer Tests

- [ ] **Test plain text rendering with default separator** — Render a prompt with multiple sections. Verify output is sections joined by `\n\n` in correct order. | Status: not_done

- [ ] **Test plain text rendering with custom separator** — Use `sectionSeparator: '\n---\n'`. Verify the custom separator is used. | Status: not_done

- [ ] **Test XML-wrapped sections** — Render with `wrapSections: true`. Verify each section is wrapped in `<sectionName>...</sectionName>` tags. | Status: not_done

- [ ] **Test `excludeSections` option** — Exclude the `safety` section. Verify it does not appear in output while other sections do. | Status: not_done

- [ ] **Test `includeSections` option** — Include only `persona` and `constraints`. Verify only those sections appear. | Status: not_done

- [ ] **Test OpenAI messages format with default role mapping** — Render with `format: 'messages'`. Verify system sections are in a system message and examples are in a user message. | Status: not_done

- [ ] **Test OpenAI messages format with custom role mapping** — Provide custom `roleMapping` that puts `context` and `examples` in user role. Verify the mapping is respected. | Status: not_done

- [ ] **Test Anthropic format** — Render with `format: 'anthropic'`. Verify `system` field contains system sections and `messages` array contains user sections. | Status: not_done

- [ ] **Test raw sections format** — Render with `format: 'sections'`. Verify the result is a `Record<string, string>` with correct section names and content. | Status: not_done

- [ ] **Test `.toMessages()` shorthand** — Verify it returns the same result as `.render({ format: 'messages' })`. | Status: not_done

- [ ] **Test section order in rendered output** — Define sections out of order. Verify the default ordering (persona, context, system, constraints, tools, safety, outputFormat, examples) is respected. | Status: not_done

- [ ] **Test custom `sectionOrder`** — Provide explicit `sectionOrder`. Verify sections are rendered in the specified order. | Status: not_done

---

## Phase 14: Inspection

- [ ] **Implement `Prompt.inspect()` method** — Return an `InspectionResult` containing: prompt name, full inheritance chain with depths, mixins at each level with prompt names and depths, resolved sections (without variable substitution), section sources (which level provided each section and what strategy), variable declarations with bound values and source, and slot fill status. | Status: not_done

- [ ] **Test `.inspect()` on a single prompt** — Verify chain has one entry, no mixins, sections sourced from self. | Status: not_done

- [ ] **Test `.inspect()` on a multi-level chain** — 3-level chain with mixins. Verify chain entries, mixin entries, and section source attribution are correct. | Status: not_done

- [ ] **Test `.inspect()` variable reporting** — Verify variables show their declaration, bound value, and source prompt. | Status: not_done

- [ ] **Test `.inspect()` slot reporting** — Verify slots show filled/unfilled status, content, and source. | Status: not_done

---

## Phase 15: Serialization — JSON

- [ ] **Implement `Prompt.serialize()` in `src/serialization/serialize.ts`** — Convert a Prompt to a `SerializedPrompt` object. Recursively serialize the parent chain. Capture all sections (with explicit strategies), variables, slots, section order, separator, metadata, and applied mixin definitions. Bound variable values are NOT serialized (per spec). | Status: not_done

- [ ] **Implement `Prompt.toJSON()`** — Call `serialize()` and return `JSON.stringify(result, null, 2)`. | Status: not_done

- [ ] **Implement `loadPrompt()` in `src/serialization/deserialize.ts`** — Accept a `SerializedPrompt` object, validate its structure (version field must be 1), recursively deserialize the parent chain, reconstruct Prompt instances with `definePrompt` and `.extend()`, reapply mixins. Return a functional Prompt. | Status: not_done

- [ ] **Implement `loadPromptFromJSON()`** — Parse a JSON string with `JSON.parse()` and pass to `loadPrompt()`. | Status: not_done

---

## Phase 16: Serialization — YAML

- [ ] **Implement minimal YAML emitter in `src/serialization/yaml.ts`** — Handle the subset of YAML needed for prompt definitions: strings (including multiline), numbers, booleans, arrays, nested objects, and null. No external dependencies. Produce clean, human-editable YAML output. | Status: not_done

- [ ] **Implement minimal YAML parser in `src/serialization/yaml.ts`** — Parse the same subset of YAML back into JavaScript objects. Handle the common cases: quoted strings, unquoted strings, numbers, booleans, arrays (both flow `[a, b]` and block `- item`), nested objects, and multiline strings. | Status: not_done

- [ ] **Implement `Prompt.toYAML()`** — Call `serialize()` and pass the result to the YAML emitter. Return a YAML string. | Status: not_done

- [ ] **Implement `loadPromptFromYAML()`** — Parse a YAML string with the inline parser and pass the result to `loadPrompt()`. | Status: not_done

---

## Phase 17: Serialization Tests

- [ ] **Test JSON round-trip for a simple prompt** — Serialize a single prompt (no parent) to JSON, deserialize, render both, and verify identical output. | Status: not_done

- [ ] **Test JSON round-trip for a prompt with inheritance** — Serialize a 3-level chain to JSON, deserialize, and verify rendering matches. | Status: not_done

- [ ] **Test JSON round-trip with mixins** — Serialize a prompt with applied mixins, deserialize, and verify rendering matches. | Status: not_done

- [ ] **Test JSON round-trip with variables and slots** — Serialize a prompt with variable declarations and slot definitions. Deserialize, bind variables, fill slots, render, and verify output. | Status: not_done

- [ ] **Test that bound variable values are NOT serialized** — Bind variables via `.set()`, serialize, deserialize, and verify variables need to be re-bound. | Status: not_done

- [ ] **Test serialized prompts use frozen semantics** — Verify that deserialized prompts do not reflect changes to the original parent objects (live reference is severed). | Status: not_done

- [ ] **Test YAML round-trip for a simple prompt** — Same as JSON round-trip but using `toYAML()` and `loadPromptFromYAML()`. | Status: not_done

- [ ] **Test YAML round-trip for a prompt with inheritance and mixins** — Full chain with mixins serialized to YAML and deserialized. Verify rendering matches. | Status: not_done

- [ ] **Test YAML output is human-readable** — Verify the YAML output contains properly formatted keys, indentation, and multiline strings. | Status: not_done

---

## Phase 18: Immutability and Live vs Frozen Inheritance Tests

- [ ] **Test `.extend()` returns new instance** — Verify the child is a different object from the parent. Verify the parent is unmodified. | Status: not_done

- [ ] **Test `.with()` returns new instance** — Apply a mixin and verify the original prompt has no mixin applied. | Status: not_done

- [ ] **Test `.override()` returns new instance** — Override a section and verify the original prompt still has the original section content. | Status: not_done

- [ ] **Test `.set()` returns new instance** — Bind a variable and verify the original prompt has no bound value. | Status: not_done

- [ ] **Test live inheritance (default)** — Create parent, extend to create child, then modify parent via `.override()`. Render the child and verify it reflects the parent's new state. Note: since `.override()` returns a new instance, test that the child references the original parent object and that if the parent object is mutable (through internal state), changes are reflected. Clarify: in the spec, `.override()` creates a new child, so "live" means the child holds a reference to the parent instance at extend time — verify this reference is maintained. | Status: not_done

- [ ] **Test frozen inheritance** — Extend with `freeze: true`. Verify the child's resolved sections are a snapshot of the parent's state at extend time. Create a new sibling from the parent with different sections and verify the frozen child is unaffected. | Status: not_done

---

## Phase 19: Cycle Detection Tests

- [ ] **Test direct cycle detection** — Attempt to create A extends B extends A. Verify `PromptCycleError` is thrown with the chain. | Status: not_done

- [ ] **Test indirect cycle detection** — Attempt to create A extends B extends C extends A. Verify `PromptCycleError` is thrown. | Status: not_done

- [ ] **Test no false positives** — Create a valid chain A -> B -> C (no cycle). Verify no error is thrown. | Status: not_done

---

## Phase 20: Edge Cases

- [ ] **Test empty sections** — Section with empty string content `""`. Verify it is included in the output as an empty string (may produce blank lines). | Status: not_done

- [ ] **Test prompt with no sections** — `definePrompt({ sections: {} })`. Verify `.render()` returns empty string and no errors. | Status: not_done

- [ ] **Test prompt with only custom section names** — No built-in section names used. Verify custom sections render correctly and in definition order. | Status: not_done

- [ ] **Test escaped curly braces in section content** — Section content containing `\{\{` that should be treated as literal text, not variable references. Verify the literal braces appear in output. | Status: not_done

- [ ] **Test very long section content** — Section with 100KB+ of content. Verify rendering completes without error and content is preserved. | Status: not_done

- [ ] **Test section set to `undefined` or `null`** — Verify sections set to `undefined` or `null` are excluded from the output entirely. | Status: not_done

- [ ] **Test multiple variables in one section** — Section with `{{a}} and {{b}} and {{c}}`. Bind all three, verify all are substituted. | Status: not_done

- [ ] **Test same variable in multiple sections** — Variable `{{name}}` used in `persona` and `constraints`. Bind once, verify substitution in both. | Status: not_done

---

## Phase 21: Integration Tests

- [ ] **Full family tree integration test** — Define a root prompt, two children extending root, and a grandchild extending one child. Apply different mixins at each level. Render each prompt and verify the output matches expected strings per the resolution algorithm. | Status: not_done

- [ ] **A/B variant integration test** — Create two variants of the same base (one JSON output, one plain text). Verify only the output format section differs; all other sections are identical when rendered. | Status: not_done

- [ ] **Multi-model adaptation integration test** — Apply Claude adapter mixin (XML wrapping) and GPT adapter mixin (markdown) to the same base. Render Claude version with `format: 'anthropic'` and `wrapSections: true`, GPT version with `format: 'messages'`. Verify format-specific adaptations. | Status: not_done

- [ ] **Complex serialization round-trip integration test** — Define a prompt with 3 inheritance levels, 2 mixins, 5 variables, and 2 slots. Serialize to JSON, deserialize, bind variables, and verify `.render()` produces identical output to the original. | Status: not_done

- [ ] **End-to-end: Base prompt to feature-specific child (spec example 20.1)** — Reproduce the exact example from spec section 20.1. Verify rendered output matches the spec's expected output. | Status: not_done

- [ ] **End-to-end: Tone mixin application (spec example 20.2)** — Reproduce spec section 20.2. Verify formal and casual variants render correctly. | Status: not_done

- [ ] **End-to-end: Full 4-level chain with mixin (spec example 20.5)** — Reproduce spec section 20.5. Verify `.inspect()` output and `.render()` output match expected values. | Status: not_done

---

## Phase 22: CLI Implementation

- [ ] **Create CLI entry point in `src/cli.ts`** — Use `node:util.parseArgs` (Node.js 18+) for argument parsing. Parse subcommands: `render`, `inspect`, `validate`. Parse all flags from spec section 14: `--format`, `--wrap-sections`, `--separator`, `--var`, `--partial`, `--exclude`, `--include`, `--json`, `--version`, `--help`. | Status: not_done

- [ ] **Implement CLI `render` command** — Read a prompt file (JSON or YAML based on extension), deserialize it, bind variables from `--var` flags, apply render options from flags, call `.render()`, and print the result to stdout. | Status: not_done

- [ ] **Implement CLI `inspect` command** — Read a prompt file, deserialize, call `.inspect()`, and print the inspection result in human-readable format (or JSON if `--json` flag is set). Match the output format from spec section 14. | Status: not_done

- [ ] **Implement CLI `validate` command** — Read a prompt file, deserialize, check for: parsability, no cycles, all required variables have defaults or are documented as render-time. Print validation result and exit with code 0 (pass) or 1 (fail). | Status: not_done

- [ ] **Implement CLI exit codes** — Exit code 0 for success, 1 for validation failure, 2 for configuration error (invalid flags, file not found, parse failure). | Status: not_done

- [ ] **Implement CLI `--version` flag** — Read version from package.json and print it. | Status: not_done

- [ ] **Implement CLI `--help` flag** — Print usage information matching the command reference from spec section 14. | Status: not_done

- [ ] **Create CLI binary entry point in `bin/prompt-inherit.js`** — `#!/usr/bin/env node` shebang. Import and execute the CLI entry point. | Status: not_done

- [ ] **Add `bin` field to `package.json`** — Map `prompt-inherit` binary name to `bin/prompt-inherit.js`. | Status: not_done

---

## Phase 23: CLI Tests

- [ ] **Test CLI `render` with JSON file** — Write a JSON prompt file to a temp directory, run CLI render command, verify stdout matches expected output. | Status: not_done

- [ ] **Test CLI `render` with YAML file** — Same as above but with a YAML prompt file. | Status: not_done

- [ ] **Test CLI `render` with `--var` flags** — Render a prompt with variables, providing values via `--var name=value` flags. Verify substitution in output. | Status: not_done

- [ ] **Test CLI `render` with `--format messages`** — Verify JSON message array is printed to stdout. | Status: not_done

- [ ] **Test CLI `render` with `--wrap-sections`** — Verify XML-wrapped output. | Status: not_done

- [ ] **Test CLI `render` with `--partial`** — Render with unbound variables and `--partial`. Verify `{{variableName}}` appears in output. | Status: not_done

- [ ] **Test CLI `inspect` command** — Run inspect on a prompt file, verify human-readable output includes chain info, section sources, and variable info. | Status: not_done

- [ ] **Test CLI `inspect --json`** — Verify JSON output of inspection result. | Status: not_done

- [ ] **Test CLI `validate` command (valid prompt)** — Run validate on a valid prompt file. Verify exit code 0. | Status: not_done

- [ ] **Test CLI `validate` command (invalid prompt)** — Run validate on a prompt with a cycle or missing required info. Verify exit code 1. | Status: not_done

- [ ] **Test CLI file not found** — Run render on a nonexistent file. Verify exit code 2 and error message. | Status: not_done

- [ ] **Test CLI `--version`** — Verify version string is printed. | Status: not_done

- [ ] **Test CLI `--help`** — Verify help text is printed. | Status: not_done

---

## Phase 24: Test Fixtures

- [ ] **Create `src/__tests__/fixtures/prompts/base-prompt.json`** — A simple base prompt with persona, constraints, safety, and outputFormat sections. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/base-prompt.yaml`** — YAML version of the base prompt fixture. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/child-prompt.json`** — A child prompt extending the base with section overrides. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/deep-chain.json`** — A 3+ level inheritance chain fixture. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/with-mixins.json`** — A prompt with mixins applied. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/with-variables.json`** — A prompt with variable declarations and template variable references. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/with-slots.json`** — A prompt with slot definitions. | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/cycle-error.json`** — A prompt definition that would create a cycle (for testing deserialization error handling). | Status: not_done

- [ ] **Create `src/__tests__/fixtures/prompts/empty.json`** — An empty/minimal prompt definition. | Status: not_done

- [ ] **Create mixin fixture files** — `formal-tone.json`, `casual-tone.json`, `json-output.json`, `strict-safety.json`, `claude-adapter.json` in `src/__tests__/fixtures/mixins/`. | Status: not_done

---

## Phase 25: Global Configuration

- [ ] **Implement `configure()` function** — Set global defaults for `defaultSectionSeparator`, `defaultWrapSections`, `defaultFormat`, `defaultRoleMapping`. These defaults are used when prompt-level and render-level configs do not specify values. | Status: not_done

- [ ] **Implement config precedence** — Ensure render-level config overrides prompt-level config, which overrides global config. Verify at every rendering code path. | Status: not_done

- [ ] **Test `configure()` affects subsequent prompts** — Call `configure({ defaultFormat: 'messages' })`, create a prompt, render without specifying format. Verify messages format is used. | Status: not_done

- [ ] **Test prompt-level config overrides global** — Set global separator to `\n---\n`, set prompt-level separator to `\n\n`. Verify prompt-level wins. | Status: not_done

- [ ] **Test render-level config overrides prompt-level** — Set prompt separator to `\n---\n`, render with `sectionSeparator: '\n\n'`. Verify render-level wins. | Status: not_done

---

## Phase 26: Documentation

- [ ] **Write README.md** — Include: package description, installation instructions, quick start example, full API reference (definePrompt, defineMixin, Prompt methods, configure, serialization functions), usage patterns (inheritance, mixins, variables, slots, multi-format rendering, serialization), CLI usage with examples, and TypeScript type safety explanation. | Status: not_done

- [ ] **Add JSDoc comments to all public API functions and types** — Every exported function, class method, interface, and type alias should have JSDoc documentation with parameter descriptions and return type descriptions. | Status: not_done

---

## Phase 27: Build, Lint, and Publish Preparation

- [ ] **Verify TypeScript compilation** — Run `npm run build` and ensure all source files compile without errors. Verify `dist/` output includes `.js`, `.d.ts`, and `.d.ts.map` files. | Status: not_done

- [ ] **Configure ESLint** — Add `.eslintrc` or `eslint.config.js` with TypeScript-appropriate rules. Ensure `npm run lint` passes on all source files. | Status: not_done

- [ ] **Run full test suite** — Execute `npm run test` and verify all tests pass. | Status: not_done

- [ ] **Verify package.json metadata** — Ensure `name`, `version`, `description`, `main`, `types`, `files`, `bin`, `engines`, `license`, `keywords`, and `publishConfig` are correct. Add keywords: `prompt`, `llm`, `inheritance`, `composition`, `template`, `openai`, `anthropic`, `mixin`. | Status: not_done

- [ ] **Verify zero runtime dependencies** — Confirm `dependencies` in package.json is empty or absent. All functionality uses only built-in Node.js modules and pure TypeScript. | Status: not_done

- [ ] **Version bump to match implementation phase** — Set version to appropriate semver based on which implementation phase is complete (0.1.0 for Phase 1 core, up to 1.0.0 for stable release). | Status: not_done

---

## Phase 28: Performance Validation

- [ ] **Benchmark prompt construction** — Verify that creating 1,000 prompt variants via `.extend()` takes under 1ms. | Status: not_done

- [ ] **Benchmark section resolution** — Verify that resolving sections for a typical prompt (depth 3, 2 mixins, 8 sections) completes in under 1ms. | Status: not_done

- [ ] **Benchmark full render pipeline** — Verify that the full render (resolution + slot filling + variable substitution + format assembly) completes in under 2ms for typical prompts and under 20ms for large prompts (100KB content, depth 10, 20 mixins, 50 variables). | Status: not_done

- [ ] **Test memory efficiency** — Verify that child prompts reference (not copy) parent sections in live mode. Confirm that a depth-10 chain with 8 sections of 1KB each uses approximately 80KB total. | Status: not_done
