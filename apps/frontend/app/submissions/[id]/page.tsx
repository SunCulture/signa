import { SubmissionDetailPage } from "./submission-detail-page"

type SubmissionDetailRouteProps = {
  params: Promise<{ id: string }>
}

export default async function SubmissionDetailRoute({
  params,
}: SubmissionDetailRouteProps) {
  const { id } = await params

  return <SubmissionDetailPage submissionId={id} />
}
