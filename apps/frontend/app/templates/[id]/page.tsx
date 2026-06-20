import { TemplateDetailPage } from "./template-detail-page"

type TemplateDetailRouteProps = {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailRoute({
  params,
}: TemplateDetailRouteProps) {
  const { id } = await params

  return <TemplateDetailPage templateId={id} />
}
