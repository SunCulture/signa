import { ApiError, apiFetch } from "./http"

const authStorageKey = "signa.auth"
const authStorageEvent = "signa.auth.changed"

export type AuthUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
  archived_at?: string | null
}

export type AuthAccount = {
  id: string
  name: string
  timezone: string
  locale: string
  archived_at?: string | null
}

export type AuthResponse = {
  access_token: string
  user: AuthUser
  account: AuthAccount
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  account_name: string
  first_name: string
  last_name: string
  locale?: string
  timezone?: string
}

export type UpdateProfileInput = {
  first_name?: string
  last_name?: string
  email?: string
}

export type UpdateAccountInput = {
  locale?: string
  name?: string
  timezone?: string
}

export type AccountPreferences = {
  allow_to_decline: boolean
  allow_to_delegate: boolean
  allow_to_resubmit: boolean
  allow_typed_signature: boolean
  cfr_part_11: boolean
  combine_pdf_result_key: boolean
  download_links_auth: boolean
  download_links_expire: boolean
  enforce_signing_order: boolean
  force_mfa: boolean
  form_prefill_signature: boolean
  hipaa: boolean
  knowledge_based_authentication: boolean
  require_signing_reason: boolean
  with_file_links: boolean
  with_signature_id: boolean
}

export type UpdateAccountPreferencesInput = Partial<AccountPreferences>

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function saveAuthSession(session: AuthResponse): void {
  window.localStorage.setItem(authStorageKey, JSON.stringify(session))
  window.dispatchEvent(new Event(authStorageEvent))
}

export function getAuthSession(): AuthResponse | null {
  const rawSession = window.localStorage.getItem(authStorageKey)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthResponse
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return null
  }
}

export function getAuthToken(): string | null {
  return getAuthSession()?.access_token ?? null
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(authStorageKey)
  window.dispatchEvent(new Event(authStorageEvent))
}

export function subscribeToAuthSessionChange(
  listener: () => void
): () => void {
  window.addEventListener("storage", listener)
  window.addEventListener(authStorageEvent, listener)

  return () => {
    window.removeEventListener("storage", listener)
    window.removeEventListener(authStorageEvent, listener)
  }
}

export function getProfile(): Promise<AuthUser> {
  return authenticatedApiFetch<AuthUser>("/profile")
}

export function getAccount(): Promise<AuthAccount> {
  return authenticatedApiFetch<AuthAccount>("/account")
}

export async function deleteAccount(): Promise<AuthAccount> {
  const account = await authenticatedApiFetch<AuthAccount>("/account", {
    method: "DELETE",
  })

  clearAuthSession()

  return account
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<AuthUser> {
  const user = await authenticatedApiFetch<AuthUser>("/profile", {
    body: JSON.stringify(input),
    method: "PATCH",
  })

  mergeAuthUserSession(user)

  return user
}

export async function updateAccount(
  input: UpdateAccountInput
): Promise<AuthAccount> {
  const account = await authenticatedApiFetch<AuthAccount>("/account", {
    body: JSON.stringify(input),
    method: "PATCH",
  })

  mergeAuthAccountSession(account)

  return account
}

export function getAccountPreferences(): Promise<AccountPreferences> {
  return authenticatedApiFetch<AccountPreferences>("/account/preferences")
}

export function updateAccountPreferences(
  input: UpdateAccountPreferencesInput
): Promise<AccountPreferences> {
  return authenticatedApiFetch<AccountPreferences>("/account/preferences", {
    body: JSON.stringify(input),
    method: "PATCH",
  })
}

export function authenticatedApiFetch<TResponse>(
  path: string,
  init?: RequestInit
): Promise<TResponse> {
  const token = getAuthToken()

  if (!token) {
    throw new ApiError("Not authenticated", 401)
  }

  const headers = new Headers(init?.headers)

  headers.set("Authorization", `Bearer ${token}`)

  return apiFetch<TResponse>(path, {
    ...init,
    headers,
  })
}

function mergeAuthUserSession(user: AuthUser): void {
  const session = getAuthSession()

  if (!session) {
    return
  }

  saveAuthSession({
    ...session,
    user: {
      ...session.user,
      ...user,
    },
  })
}

function mergeAuthAccountSession(account: AuthAccount): void {
  const session = getAuthSession()

  if (!session) {
    return
  }

  saveAuthSession({
    ...session,
    account: {
      ...session.account,
      ...account,
    },
  })
}
