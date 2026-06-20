# Code Shape Rules

## Function Size

Use these defaults for TypeScript application code:

- Ideal: 5-15 executable lines.
- Review threshold: 20-30 lines.
- Refactor threshold: over 30 lines, unless there is a documented reason.
- React component threshold: 50-80 lines when most lines are declarative JSX.
- Algorithm/reducer threshold: up to 100 lines when complexity is controlled and splitting would make it harder to reason about.

Prefer these refactorings:

- Extract Method for named blocks.
- Introduce Parameter Object for 4+ related parameters.
- Preserve Whole Object when callers are unpacking the same object repeatedly.
- Decompose Conditional for nested `if` or complex boolean logic.
- Move Method/Object when a helper mostly operates on another object or domain concept.

## File Size

Use these defaults:

- Ideal ordinary file: under 300 lines.
- Review threshold: 300-500 lines.
- Refactor threshold: over 500 lines.
- Severe design-debt threshold: over 1000 lines.
- Avoid 2000-3000 line services unless generated or explicitly justified.

Split by responsibility:

- validation: `validate-create-order-request.ts`
- mapping: `map-order-to-response.ts`
- policy: `can-user-cancel-order.ts`
- query: `find-active-subscription.ts`
- adapter/client: `stripe-payment-client.ts`
- orchestration: keep the service as a readable workflow that calls named helpers.

## Parameter Count

Use these defaults:

- 0-2 parameters: normal.
- 3 parameters: acceptable when names/types are obvious.
- 4+ parameters: prefer a typed object.

Example:

```ts
type CreateInvoiceInput = {
  customerId: string;
  orderId: string;
  currencyCode: string;
  requestedByUserId: string;
};

function createInvoice(input: CreateInvoiceInput) {
  // ...
}
```

## Complexity

Reduce complexity by:

- Returning early for invalid states.
- Moving condition names into predicates such as `canCancelOrder`.
- Replacing large conditionals with lookup maps or policies when the domain is table-driven.
- Keeping loops and conditionals shallow.
- Avoiding mixed levels of abstraction in one function.

Use ESLint rules as guardrails when the project accepts them:

```js
export default [
  {
    rules: {
      "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 30, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", 3],
      "complexity": ["warn", { max: 10 }]
    }
  }
];
```

For React projects, consider overrides for component files:

```js
export default [
  {
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }]
    }
  }
];
```

## Review Checklist

- Does every function have one reason to change?
- Does every file have one primary responsibility?
- Can the main workflow be read top-to-bottom without detouring into implementation detail?
- Are validation, mapping, persistence, I/O, and UI concerns separated where practical?
- Are exceptions intentional and documented?
