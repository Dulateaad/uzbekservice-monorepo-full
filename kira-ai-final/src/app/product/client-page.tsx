"use client";

import React, { useState, useEffect } from "react";
import { FirebaseClientProvider, useFirebase } from "@/firebase";
import { doc, onSnapshot, DocumentSnapshot, DocumentData, FirestoreError } from "firebase/firestore";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Product } from "@/lib/types";
import { getCatalogProductById } from "@/lib/catalog-products";
import Loading from "@/app/loading";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { TryOnPanel } from "./TryOnPanel";

type WithId<T> = T & { id: string };

function ProductDetailComponent({ id }: { id: string }) {
  const { firestore } = useFirebase();
  const [product, setProduct] = useState<WithId<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const router = useRouter();
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fromCatalog = getCatalogProductById(id);
    if (fromCatalog) {
      setProduct(fromCatalog);
      if (fromCatalog.sizes?.length && !selectedSize) {
        setSelectedSize(fromCatalog.sizes[0]);
      }
      if (fromCatalog.colors?.length && !selectedColor) {
        setSelectedColor(fromCatalog.colors[0]);
      }
      setIsLoading(false);
      return;
    }

    if (!firestore || !id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const productRef = doc(firestore, "products", id);

    const unsubscribe = onSnapshot(
      productRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const productData = { ...(snapshot.data() as Product), id: snapshot.id };
          setProduct(productData);
          if (productData.sizes && productData.sizes.length > 0 && !selectedSize) {
            setSelectedSize(productData.sizes[0]);
          }
          if (productData.colors && productData.colors.length > 0 && !selectedColor) {
            setSelectedColor(productData.colors[0]);
          }
        } else {
          setProduct(null);
        }
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("Error fetching product:", error);
        setProduct(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, id, selectedSize, selectedColor]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!selectedSize) {
        toast({
            title: "Выберите размер",
            description: "Пожалуйста, выберите размер перед добавлением в корзину.",
            variant: "destructive"
        });
        return;
    }
    addItem({ ...product, quantity: 1, size: selectedSize });
    toast({
        title: "Добавлено в корзину",
        description: `${product.name} (размер: ${selectedSize}) был добавлен в вашу корзину.`,
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!product) {
    notFound();
  }
  
  const imageUrl = (product.imageUrls && product.imageUrls[0]) || (product as any).imageUrl || "https://placehold.co/400x500";


  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
      <div className="max-w-4xl mx-auto">
         <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
        </Button>
        <Card className="shadow-lg overflow-hidden md:grid md:grid-cols-2 md:gap-8">
            <CardHeader className="p-0">
            <div className="aspect-[4/5] relative">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                />
            </div>
            </CardHeader>
            <CardContent className="p-6 flex flex-col">
            <h1 className="text-3xl lg:text-4xl font-headline text-foreground">
                {product.name}
            </h1>
            <p className="mt-4 text-2xl font-semibold text-primary">
                ₸{product.price.toFixed(0)}
            </p>
            <Separator className="my-6" />

            {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                    <Label className="text-lg font-medium mb-3 block">Цвет</Label>
                    <div className="flex items-center gap-3">
                        {product.colors.map((color) => (
                            <button key={color} onClick={() => setSelectedColor(color)} className={cn("h-8 w-8 rounded-full border-2 transition", selectedColor === color ? "border-primary scale-110" : "border-transparent")} style={{ backgroundColor: color }} title={color} />
                        ))}
                    </div>
                </div>
            )}
            
            {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                    <Label className="text-lg font-medium mb-3 block">Размер</Label>
                        <RadioGroup value={selectedSize || ""} onValueChange={setSelectedSize} className="flex items-center gap-2">
                        {product.sizes.map((size) => (
                                <Label key={size} htmlFor={`size-${size}`} className={cn("h-10 w-10 flex items-center justify-center rounded-md border cursor-pointer transition-colors text-sm font-medium", selectedSize === size ? "bg-primary text-primary-foreground border-transparent" : "bg-secondary hover:bg-secondary/80")}>
                                <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
                                {size}
                                </Label>
                        ))}
                    </RadioGroup>
                </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
                {product.description}
            </p>

            <div className="mt-auto pt-6">
                <Button onClick={handleAddToCart} size="lg" className="w-full">
                    <ShoppingCart className="mr-2 h-5 w-5"/>
                    Добавить в корзину
                </Button>
            </div>
            </CardContent>
        </Card>
        <TryOnPanel product={product} />
      </div>
    </div>
  );
}


export function ProductClientPage({ id }: { id: string }) {
  return (
    <FirebaseClientProvider>
      <ProductDetailComponent id={id} />
    </FirebaseClientProvider>
  );
}
