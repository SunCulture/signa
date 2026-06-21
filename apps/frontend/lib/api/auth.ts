import { ApiError, apiFetch } from "./http"
import type { SignaRole } from "@repo/shared"

const authStorageKey = "signa.auth"
const authStorageEvent = "signa.auth.changed"

export type AuthUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: SignaRole
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
  bcc_emails: string
  receive_completed_email: boolean
  submitter_reminders: SubmitterReminders
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
  esigning_preference: "single" | "multiple"
  flatten_result_pdf: boolean
  document_filename_format: DocumentFilenameFormat
  submitter_invitation_email: AccountEmailTemplate
  submitter_documents_copy_email: AccountDocumentsCopyEmailTemplate
  submitter_completed_email: AccountCompletedEmailTemplate
  form_completed_message: CompletedFormMessage
  form_completed_button: CompletedFormButton
  form_with_confetti: boolean
  policy_links: string
}

export type SubmitterReminders = {
  first_duration: string | null
  second_duration: string | null
  third_duration: string | null
}

export type DocumentFilenameFormat =
  | "{document.name}"
  | "{document.name} - {submission.status}"
  | "{document.name} - {submission.submitters}"
  | "{document.name} - {submission.submitters} - {submission.completed_at}"

export type AccountEmailTemplate = {
  subject: string
  body: string
  reply_to?: string | null
}

export type AccountDocumentsCopyEmailTemplate = AccountEmailTemplate & {
  attach_audit_log: boolean
  attach_documents: boolean
  enabled: boolean
}

export type AccountCompletedEmailTemplate = AccountEmailTemplate & {
  attach_audit_log: boolean
  attach_documents: boolean
}

export type CompletedFormMessage = {
  title?: string
  body?: string
}

export type CompletedFormButton = {
  title?: string
  url?: string
}

export type AccountLogo = {
  uuid: string
  filename: string
  content_type: string | null
  url: string
}

export type SigningCertificate = {
  name: string
  filename?: string
  status: "active" | "default"
  valid_to: string | null
}

export type AccountEmailIntegrationProvider = "gmail" | "microsoft"

export type AccountEmailIntegration = {
  provider: AccountEmailIntegrationProvider
  name: string
  connected: boolean
  configured: boolean
  email: string | null
  connected_at: string | null
}

export type AccountEmailIntegrationConnectResponse = {
  provider: AccountEmailIntegrationProvider
  connected: boolean
  configured: boolean
  url: string | null
}

export const apiTokenPermissions = [
  "templates:read",
  "templates:write",
  "submissions:read",
  "submissions:write",
  "submitters:read",
  "submitters:write",
  "webhooks:read",
  "webhooks:write",
  "tools:use",
  "users:read",
  "users:write",
] as const

export type ApiTokenPermission = (typeof apiTokenPermissions)[number]

export type ApiToken = {
  id: string
  token: string
  role: SignaRole | "unknown"
  permissions: ApiTokenPermission[]
  permissions_note: string
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export type RevealedApiToken = ApiToken & {
  revealed_token: string
}

export type UpdateAccountPreferencesInput = Partial<AccountPreferences>

export type UserStatus = "active" | "archived"

export type CreateUserInput = {
  email: string
  first_name?: string
  last_name?: string
  password?: string
  role?: SignaRole
}

export type UpdateUserInput = Partial<CreateUserInput> & {
  otp_required_for_login?: boolean
}

export type ImportUserInput = {
  email: string
  first_name?: string
  last_name?: string
  role?: SignaRole
  team?: string
}

export type ImportUserResult = {
  row: number
  email: string
  status: "created" | "restored" | "skipped" | "failed"
  message?: string
}

export type ImportUsersResponse = {
  results: ImportUserResult[]
  total: number
  created: number
  restored: number
  skipped: number
  failed: number
}

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

export function getAccountLogo(): Promise<AccountLogo | null> {
  return authenticatedApiFetch<AccountLogo | null>("/account/logo")
}

export function uploadAccountLogo(file: File): Promise<AccountLogo> {
  const formData = new FormData()

  formData.set("file", file, file.name)

  return authenticatedApiFetch<AccountLogo>("/account/logo", {
    body: formData,
    method: "POST",
  })
}

export function deleteAccountLogo(): Promise<AccountLogo | null> {
  return authenticatedApiFetch<AccountLogo | null>("/account/logo", {
    method: "DELETE",
  })
}

export async function listSigningCertificates(): Promise<
  SigningCertificate[]
> {
  const response = await authenticatedApiFetch<{ data: SigningCertificate[] }>(
    "/account/signing-certificates"
  )

  return response.data
}

export function uploadSigningCertificate(
  file: File,
  name: string
): Promise<SigningCertificate> {
  const formData = new FormData()

  formData.set("name", name)
  formData.set("file", file, file.name)

  return authenticatedApiFetch<SigningCertificate>(
    "/account/signing-certificates",
    {
      body: formData,
      method: "POST",
    }
  )
}

export function makeDefaultSigningCertificate(
  name: string
): Promise<SigningCertificate> {
  return authenticatedApiFetch<SigningCertificate>(
    "/account/signing-certificates/default",
    {
      body: JSON.stringify({ name }),
      method: "PATCH",
    }
  )
}

export function deleteSigningCertificate(
  name: string
): Promise<SigningCertificate> {
  return authenticatedApiFetch<SigningCertificate>(
    "/account/signing-certificates",
    {
      body: JSON.stringify({ name }),
      method: "DELETE",
    }
  )
}

export async function listAccountEmailIntegrations(): Promise<
  AccountEmailIntegration[]
> {
  const response = await authenticatedApiFetch<{
    data: AccountEmailIntegration[]
  }>("/account/integrations")

  return response.data
}

export function connectAccountEmailIntegration(
  provider: AccountEmailIntegrationProvider
): Promise<AccountEmailIntegrationConnectResponse> {
  return authenticatedApiFetch<AccountEmailIntegrationConnectResponse>(
    `/account/integrations/${provider}/connect`,
    { method: "POST" }
  )
}

export function completeAccountEmailIntegration(
  provider: AccountEmailIntegrationProvider,
  input: { code: string; state?: string | null }
): Promise<AccountEmailIntegration> {
  return authenticatedApiFetch<AccountEmailIntegration>(
    `/account/integrations/${provider}/callback`,
    {
      body: JSON.stringify(input),
      method: "POST",
    }
  )
}

export function disconnectAccountEmailIntegration(
  provider: AccountEmailIntegrationProvider
): Promise<AccountEmailIntegration> {
  return authenticatedApiFetch<AccountEmailIntegration>(
    `/account/integrations/${provider}`,
    { method: "DELETE" }
  )
}

export function getApiToken(): Promise<ApiToken> {
  return authenticatedApiFetch<ApiToken>("/auth/api-token")
}

export function revealApiToken(password: string): Promise<RevealedApiToken> {
  return authenticatedApiFetch<RevealedApiToken>("/auth/api-token/reveal", {
    body: JSON.stringify({ password }),
    method: "POST",
  })
}

export function rotateApiToken(input: {
  password: string
  permissions?: ApiTokenPermission[]
}): Promise<RevealedApiToken> {
  return authenticatedApiFetch<RevealedApiToken>("/auth/api-token/rotate", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function updateApiTokenPermissions(
  permissions: ApiTokenPermission[]
): Promise<ApiToken> {
  return authenticatedApiFetch<ApiToken>("/auth/api-token/permissions", {
    body: JSON.stringify({ permissions }),
    method: "PATCH",
  })
}

export function listUsers(status: UserStatus = "active"): Promise<AuthUser[]> {
  return authenticatedApiFetch<AuthUser[]>(`/users?status=${status}`)
}

export function createUser(input: CreateUserInput): Promise<AuthUser> {
  return authenticatedApiFetch<AuthUser>("/users", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function importUsers(
  users: ImportUserInput[]
): Promise<ImportUsersResponse> {
  return authenticatedApiFetch<ImportUsersResponse>("/users/import", {
    body: JSON.stringify({ users }),
    method: "POST",
  })
}

export function updateUser(
  userId: string,
  input: UpdateUserInput
): Promise<AuthUser> {
  return authenticatedApiFetch<AuthUser>(`/users/${userId}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  })
}

export function archiveUser(userId: string): Promise<AuthUser> {
  return authenticatedApiFetch<AuthUser>(`/users/${userId}`, {
    method: "DELETE",
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
