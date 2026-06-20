import { SigningPage } from "./signing-page";

export default async function PublicSigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const { slug } = await params;
  const { f } = await searchParams;

  return <SigningPage focusFieldPrefix={f} slug={slug} />;
}
