"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Loading from "@/app/loading";
import { ProductClientPage } from "./client-page";

function ProductQueryGate() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";

  if (!id) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-muted-foreground">Товар не указан. Откройте карточку с главной страницы.</p>
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    );
  }

  return <ProductClientPage id={id} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductQueryGate />
    </Suspense>
  );
}
