"use client";

import { ProductClientPage } from "./client-page";
import Loading from "@/app/loading";

export function ProductPageClient({ id }: { id: string }) {
  if (!id) {
    return <Loading />;
  }
  return <ProductClientPage id={id} />;
}
