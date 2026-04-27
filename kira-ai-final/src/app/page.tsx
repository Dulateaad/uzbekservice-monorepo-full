
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
                <Link href={`/product/${product.id}`} className="block overflow-hidden aspect-[4/5] rounded-t-xl">
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
                        <Link href={`/product/${product.id}`} className="hover:text-primary transition-colors">
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

function ProductGrid() {
  const { firestore } = useFirebase();
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, isLoading } = useCollection<Product & { id:string }>(productsCollection);

  const hardcodedProduct: Product & { id: string } = {
    id: 'jacket_black_gold_001',
    name: 'Укороченный жакет с декоративными золотыми застёжками',
    description: 'Элегантный укороченный жакет с архитектурным силуэтом и декоративными золотыми застёжками.',
    price: 128900,
    imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/5208617976892954348.jpg?alt=media&token=89fc989a-e361-447a-ba06-98dce2f8e1fc'],
    category: 'jacket',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['black'],
    ownerId: 'kira-selection-owner'
  };

  const hardcodedProduct2: Product & { id: string } = {
    id: 'dress_evening_black_002',
    name: 'Вечернее платье-бюстье с драпировкой',
    description: 'Скульптурное вечернее платье-бюстье с архитектурным силуэтом и драпировкой.',
    price: 189900,
    imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6886%20(1).JPG?alt=media&token=cbefa4ee-f209-4a3c-a934-ce28258565ab'],
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['black'],
    ownerId: 'kira-selection-owner'
  };

  const hardcodedProduct3: Product & { id: string } = {
    id: 'skirt_leather_black_001',
    name: 'Мини-юбка с драпировкой из эко-кожи',
    description: 'Мини-юбка из эко-кожи с асимметричной драпировкой и высокой посадкой.',
    price: 64900,
    imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6887.JPG?alt=media&token=429738be-9f45-4bac-a933-07a0513741a1'],
    category: 'skirt',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['black'],
    ownerId: 'kira-selection-owner'
  };

  const allProducts = (products 
    ? [hardcodedProduct, hardcodedProduct2, hardcodedProduct3, ...products.filter(p => !['jacket_black_gold_001', 'dress_evening_black_002', 'skirt_leather_black_001'].includes(p.id))] 
    : [hardcodedProduct, hardcodedProduct2, hardcodedProduct3]);

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
