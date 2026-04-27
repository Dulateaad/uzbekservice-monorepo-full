"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/context/cart-context";
import { Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


export default function CartPage() {
    const { items, removeItem, updateItemQuantity, clearCart } = useCart();
    const { toast } = useToast();

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleCheckout = () => {
        if (items.length === 0) {
            toast({
                title: "Ваша корзина пуста",
                description: "Добавьте товары, чтобы оформить заказ.",
                variant: "destructive",
            });
            return;
        }

        // Here you would typically integrate with a payment provider
        toast({
            title: "Заказ успешно оформлен!",
            description: "Спасибо за покупку! Мы скоро с вами свяжемся.",
        });
        clearCart();
    };
    
     const handleQuantityChange = (productId: string, size: string, currentQuantity: number, change: number) => {
        const newQuantity = currentQuantity + change;
        if (newQuantity > 0) {
            updateItemQuantity(productId, size, newQuantity);
        } else {
            removeItem(productId, size);
        }
    }


  return (
    <div className="container mx-auto max-w-4xl py-6 sm:py-12 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Корзина</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {items.length > 0 ? (
                        items.map((item, index) => (
                            <div key={`${item.id}-${item.size}-${index}`} className="flex items-center gap-4">
                                <Image 
                                    src={item.imageUrls[0]} 
                                    alt={item.name} 
                                    width={80} 
                                    height={100} 
                                    className="rounded-md object-cover" 
                                />
                                <div className="flex-grow">
                                    <h3 className="font-semibold">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground">Размер: {item.size}</p>
                                     <div className="flex items-center gap-2 mt-1">
                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleQuantityChange(item.id, item.size, item.quantity, -1)}>-</Button>
                                        <span>{item.quantity}</span>
                                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleQuantityChange(item.id, item.size, item.quantity, 1)}>+</Button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">₸{(item.price * item.quantity).toFixed(0)}</p>
                                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id, item.size)} className="mt-1">
                                        <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground mb-4">Ваша корзина пуста.</p>
                             <Button asChild>
                                <Link href="/">Перейти в маркетплейс</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Оформление заказа</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Итого:</span>
                        <span>₸{total.toFixed(0)}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="name">Имя</Label>
                        <Input id="name" placeholder="Иван" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="surname">Фамилия</Label>
                        <Input id="surname" placeholder="Иванов" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Адрес</Label>
                        <Input id="address" placeholder="ул. Пушкина, д. 10" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Телефон</Label>
                        <Input id="phone" placeholder="+7 (999) 123-45-67" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleCheckout} disabled={items.length === 0}>Подтвердить заказ</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
