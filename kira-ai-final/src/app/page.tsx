
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollection, FirebaseClientProvider, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { KIRA_CATALOG_PRODUCTS, KIRA_CATALOG_ID_SET } from "@/lib/catalog-products";
import Loading from "./loading";
import { ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart-context";

function ProductCard({ product }: { product: Product & { id: string } }) {
    const { toast } = useToast();
    const { addItem } = useCart();
    
    const handleAddToCart = () => {
        if (!product.sizes || product.sizes.length === 0) {
            toast({
                title: "Невозможно добавить товар",
                description: "У этого товара нет доступных размеров.",
                variant: "destructive"
            });
            return;
        }
        addItem({ ...product, quantity: 1, size: product.sizes[0] });
        toast({
            title: "Добавлено в корзину",
            description: `${product.name} был добавлен в вашу корзину.`,
        });
    }

    const imageUrl = (product.imageUrls && product.imageUrls[0]) || (product as any).imageUrl || "https://placehold.co/800x1000";
    
    return (
        <Card
            key={product.id}
            className="group overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card/80 backdrop-blur-sm border-white/20"
        >
            <CardContent className="p-0">
                <Link href={`/product?id=${encodeURIComponent(product.id)}`} className="block overflow-hidden aspect-[4/5] rounded-t-xl">
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        width={800}
                        height={1000}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </Link>
                <div className="p-4 space-y-1 flex-grow">
                    <h3 className="font-body text-base leading-snug h-10 overflow-hidden">
                        <Link href={`/product?id=${encodeURIComponent(product.id)}`} className="hover:text-primary transition-colors">
                            {product.name}
                        </Link>
                    </h3>
                </div>
                <div className="p-4 pt-0 flex justify-between items-center">
                    <p className="text-lg font-bold text-foreground">
                        ₸{product.price.toFixed(0)}
                    </p>
                    <Button size="icon" variant="ghost" className="shrink-0 rounded-full" onClick={handleAddToCart}>
                        <ShoppingCart className="h-5 w-5"/>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

/** Скрываем позиции маркетплейса по подстрокам в названии (данные из Firestore). */
function isProductHiddenByName(name: string): boolean {
  const n = name.toLowerCase().replaceAll("ё", "е");
  const markers = ["лонгслив", "шорты", "шитьем", "шитьём", "оверсайз"];
  return markers.some((m) => n.includes(m.replaceAll("ё", "е")));
}

function ProductGrid() {
  const { firestore } = useFirebase();
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, isLoading } = useCollection<Product & { id:string }>(productsCollection);

  const merged = products
    ? [...KIRA_CATALOG_PRODUCTS, ...products.filter((p) => !KIRA_CATALOG_ID_SET.has(p.id))]
    : [...KIRA_CATALOG_PRODUCTS];

  const allProducts = merged.filter((p) => !isProductHiddenByName(p.name || ""));

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {allProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function Hero() {
    return (
        <div className="text-center pt-10 pb-16 md:pt-16 md:pb-24 flex flex-col items-center">
            <span className="text-3xl font-headline font-normal text-foreground tracking-[0.2em] mb-8">
                KIRA AI
            </span>
            <h1 className="text-3xl font-headline font-normal tracking-tight text-foreground mb-4">
                Dress with intuition
            </h1>
            <p className="max-w-xl mx-auto text-lg text-muted-foreground">
              Ваш AI-стилист, который показывает, как вещи будут выглядеть именно на вас ещё до покупки
            </p>
        </div>
    )
}

export default function Home() {
  return (
    <FirebaseClientProvider>
      <div className="container">
        <Hero />
        <ProductGrid />
      </div>
    </FirebaseClientProvider>
  );
}
