import { ProductPageClient } from "./page-client";

export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductPageClient id={id} />;
}
