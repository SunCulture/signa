import { authenticatedApiFetch } from "./auth"

export type CreateSubmissionSubmitterInput = {
  email?: string
  name?: string
  role?: string
}

export type CreateSubmissionInput = {
  name?: string
  template_id: string
  submitters: CreateSubmissionSubmitterInput[]
}

export type SubmissionSubmitterResponse = {
  id: string
  submission_id: string
  uuid: string
  email: string | null
  slug: string
  name: string | null
  role: string
  status: string
  embed_src?: string
}

export function createSubmission(
  input: CreateSubmissionInput
): Promise<SubmissionSubmitterResponse[]> {
  return authenticatedApiFetch<SubmissionSubmitterResponse[]>("/submissions", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

