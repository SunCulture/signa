---
name: write-readable-typescript
description: Write, review, and refactor TypeScript or JavaScript code for clear names, small single-purpose functions, manageable files, low complexity, and maintainable structure. Use when creating AI-generated code, renaming folders/files/functions/classes/variables, reviewing readability, splitting large services/components, reducing long functions, or enforcing clean code shape in TypeScript, React, Next.js, NestJS, Node.js, or frontend/backend projects.
---

# Write Readable TypeScript

Use this skill to keep AI-generated TypeScript easy to search, review, test, and maintain.

## Core Rules

1. Name things by job and domain meaning.
   - Use names that closely describe what the folder, file, function, class, type, or variable does.
   - Prefer whole words over abbreviations.
   - Avoid generic names such as `utils`, `helper`, `manager`, `data`, `item`, `thing`, `processData`, or `handleSubmit` when a domain-specific name is available.
   - Rename unclear code before adding more code around it.

2. Keep functions small and single-purpose.
   - Aim for 5-15 executable lines.
   - Treat 20-30 lines as the review threshold.
   - Extract code when a function validates, transforms, persists, renders, and notifies in one body.
   - Limit parameters to 2-3; use a typed options object for larger input sets.
   - Keep branching shallow; extract conditionals and loops when they hide the main path.

3. Keep files focused.
   - Prefer files under 300-500 lines for ordinary application code.
   - Treat files over 500 lines as split candidates.
   - Treat files over 1000 lines as design debt unless generated, test fixtures, or a documented exception.
   - Do not let services grow into 2000-3000 line catch-all files; split by business capability, workflow step, adapter, query, validator, mapper, or policy.

4. Match code organization to reviewability.
   - Put one logical component/service/module per file.
   - Use directories that reveal feature ownership, not vague technical buckets.
   - Keep public exports intentional and small.
   - Prefer named exports for stable searchable names unless the framework requires a default export.

5. Validate shape before finishing.
   - Run project lint/typecheck/tests when available.
   - Run `write-readable-typescript/scripts/check_code_shape.py <path>` for a quick long-file/function scan.
   - Review findings with judgment; thresholds are guardrails, not compiler laws.

## Naming Defaults

- Folders/files: kebab-case for application files unless the framework has a convention.
- React components/classes/types/enums: PascalCase.
- Functions, methods, variables, parameters, properties: camelCase.
- Constants: camelCase for local constants; UPPER_CASE only for true module-level constants or environment keys.
- Booleans: start with `is`, `has`, `can`, `should`, `was`, `will`, or another truth-bearing verb.
- Async functions: use a verb that reveals the side effect or I/O, such as `fetchUserProfile`, `createInvoice`, or `sendPasswordResetEmail`.
- Types/interfaces: name by domain concept, not shape mechanics. Prefer `UserProfile` over `UserProfileInterface`.

## Refactoring Triggers

Extract a function when:

- A comment explains what the next block does.
- A block has a clear name waiting to be used.
- The function has more than one reason to change.
- The same values travel together through several calls.
- Nested conditionals make the happy path hard to see.

Split a file when:

- Reviewers must scroll across unrelated responsibilities.
- Tests would naturally target a smaller helper or policy.
- Imports reveal mixed concerns such as HTTP, persistence, validation, formatting, and notifications in one file.
- A service contains independent private methods that could be feature helpers.

## Exceptions

- React/JSX components may exceed 30 lines because markup is verbose, but extract data fetching, event logic, validation, and derived state.
- Reducers, parsers, generated code, schema maps, route tables, and test fixtures may be longer when splitting would reduce clarity.
- Algorithms may be longer when the named steps are still clear and local reasoning is better than fragmentation.
- Document exceptions briefly near the code or in review notes.

## References

- Read [naming-rules.md](references/naming-rules.md) for detailed naming conventions and examples.
- Read [code-shape-rules.md](references/code-shape-rules.md) for thresholds, split strategies, and lint configuration suggestions.
- Read [sources.md](references/sources.md) before updating this skill.
