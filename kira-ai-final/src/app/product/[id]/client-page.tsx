"use client";

import React, { useState, useEffect } from "react";
import { FirebaseClientProvider, useFirebase } from "@/firebase";
import { doc, onSnapshot, DocumentSnapshot, DocumentData, FirestoreError } from "firebase/firestore";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Product } from "@/lib/types";
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

const hardcodedProduct: WithId<Product> = {
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

const hardcodedProduct2: WithId<Product> = {
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

const hardcodedProduct3: WithId<Product> = {
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

const hardcodedProduct4: WithId<Product> = {
  id: 'pants_lavender_tailored_001',
  name: 'Брюки с высокой посадкой Lavender Tailored',
  description: 'Широкие брюки с высокой посадкой в оттенке soft lavender. Создают вытянутый силуэт.',
  price: 72900,
  imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6889.JPG?alt=media&token=70c4584a-f257-44c3-a236-cc3bcb43de97'],
  category: 'pants',
  sizes: ['XS', 'S', 'M', 'L'],
  colors: ['lavender'],
  ownerId: 'kira-selection-owner'
};

const hardcodedProduct5: WithId<Product> = {
    id: 'dress_scarlet_sculpt_001',
    name: 'Платье мини Scarlet Sculpt',
    description: 'Структурированное мини-платье scarlet red, формирующее выразительный силуэт.',
    price: 89900,
    imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6890.JPG?alt=media&token=ef09395c-1546-4448-8c05-63a7e5f35cd7'],
    category: 'dress',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['scarlet red'],
    ownerId: 'kira-selection-owner'
};

const hardcodedProduct6: WithId<Product> = {
    id: 'top_silk_aura_wrap_ivory_001',
    name: 'Топ Silk Aura Wrap Ivory',
    description: 'Элегантный wrap-топ ivory с драпировкой и струящимися рукавами.',
    price: 54900,
    imageUrls: ['https://firebasestorage.googleapis.com/v0/b/studio-4612461108-2107c.firebasestorage.app/o/IMG_6893.JPG?alt=media&token=1b14ccf0-e6be-4535-83f6-a496b99d7895'],
    category: 'top',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['ivory'],
    ownerId: 'kira-selection-owner'
};


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
    // Handle the hardcoded product as a special case
    if (id === hardcodedProduct.id) {
        setProduct(hardcodedProduct);
        if (hardcodedProduct.sizes && hardcodedProduct.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct.sizes[0]);
        }
        if (hardcodedProduct.colors && hardcodedProduct.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct.colors[0]);
        }
        setIsLoading(false);
        return;
    }
    if (id === hardcodedProduct2.id) {
        setProduct(hardcodedProduct2);
        if (hardcodedProduct2.sizes && hardcodedProduct2.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct2.sizes[0]);
        }
        if (hardcodedProduct2.colors && hardcodedProduct2.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct2.colors[0]);
        }
        setIsLoading(false);
        return;
    }
    if (id === hardcodedProduct3.id) {
        setProduct(hardcodedProduct3);
        if (hardcodedProduct3.sizes && hardcodedProduct3.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct3.sizes[0]);
        }
        if (hardcodedProduct3.colors && hardcodedProduct3.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct3.colors[0]);
        }
        setIsLoading(false);
        return;
    }
    if (id === hardcodedProduct4.id) {
        setProduct(hardcodedProduct4);
        if (hardcodedProduct4.sizes && hardcodedProduct4.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct4.sizes[0]);
        }
        if (hardcodedProduct4.colors && hardcodedProduct4.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct4.colors[0]);
        }
        setIsLoading(false);
        return;
    }
    if (id === hardcodedProduct5.id) {
        setProduct(hardcodedProduct5);
        if (hardcodedProduct5.sizes && hardcodedProduct5.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct5.sizes[0]);
        }
        if (hardcodedProduct5.colors && hardcodedProduct5.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct5.colors[0]);
        }
        setIsLoading(false);
        return;
    }
    if (id === hardcodedProduct6.id) {
        setProduct(hardcodedProduct6);
        if (hardcodedProduct6.sizes && hardcodedProduct6.sizes.length > 0 && !selectedSize) {
            setSelectedSize(hardcodedProduct6.sizes[0]);
        }
        if (hardcodedProduct6.colors && hardcodedProduct6.colors.length > 0 && !selectedColor) {
            setSelectedColor(hardcodedProduct6.colors[0]);
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
