# Naming Rules

## Principle

Names should answer: what is this, what does it do, and where should I look when it breaks?

## Folder Names

Use feature or domain names:

- `billing/`
- `user-profile/`
- `password-reset/`
- `invoice-reconciliation/`

Avoid vague buckets unless the project already uses them intentionally:

- `helpers/`
- `utils/`
- `common/`
- `misc/`

When a folder must be shared, name it by purpose:

- `date-formatting/`
- `api-contracts/`
- `auth-policies/`
- `currency-calculation/`

## File Names

Name files after the primary export or responsibility:

- `calculate-invoice-total.ts`
- `validate-signup-request.ts`
- `create-password-reset-token.ts`
- `user-profile-card.tsx`
- `orders.service.ts`
- `orders.controller.ts`

Avoid:

- `index2.ts`
- `new-service.ts`
- `helpers.ts`
- `logic.ts`
- `data.ts`

Use barrel files only when they improve the import surface. Do not hide a large feature behind an `index.ts` that exports unrelated code.

## Function Names

Use verb phrases for actions:

- `calculateInvoiceTotal`
- `validateSignupRequest`
- `mapOrderToInvoiceRow`
- `fetchActiveSubscription`
- `sendPasswordResetEmail`

Use noun phrases only for factories/constants/selectors where the value is the point:

- `createUserRepository`
- `activeSubscriptionQuery`
- `paidInvoiceStatuses`

Avoid weak verbs:

- `doStuff`
- `process`
- `handle`
- `manage`
- `run`
- `execute`

If a framework requires a weak handler name, wrap the real work in named functions:

```ts
async function handleSubmit() {
  const signupRequest = collectSignupRequest();
  await submitSignupRequest(signupRequest);
}
```

## Variable Names

Name variables by domain role, not storage shape:

- `paidInvoices`, not `items`
- `selectedPlanId`, not `value`
- `subscriptionRenewalDate`, not `date`
- `invoiceTotalCents`, not `amount`

Short names are acceptable only in tiny scopes:

- `id` in a 3-line mapper is fine.
- `i` is acceptable for a basic index loop.
- Expand names when scope grows.

## Type and Class Names

Use PascalCase:

- `UserProfile`
- `CreateInvoiceRequest`
- `PaymentGatewayClient`
- `SubscriptionRepository`

Do not prefix interfaces with `I` by default. Prefer `UserProfile` over `IUserProfile`.

Use suffixes when they communicate architecture:

- `Controller`
- `Service`
- `Repository`
- `Client`
- `Adapter`
- `Policy`
- `Mapper`
- `Validator`

Do not use suffixes as decoration. A `PaymentManager` should become `PaymentService`, `PaymentCoordinator`, `PaymentPolicy`, or a more specific domain name.

## Boolean Names

Use names that read naturally in conditions:

- `isAuthenticated`
- `hasActiveSubscription`
- `canCreateInvoice`
- `shouldSendReceipt`
- `wasRefunded`

Avoid negated booleans when possible:

- Prefer `isEnabled` over `isNotDisabled`.
- Prefer `hasPermission` over `lacksPermission`.

## Naming Review Checklist

- Can I search the name and find the right code quickly?
- Would a new developer know the domain meaning without opening the implementation?
- Does the name reveal side effects such as create, update, delete, send, write, or publish?
- Does the file name match its primary export?
- Are generic words hiding a missing abstraction?
