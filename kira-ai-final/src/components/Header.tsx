"use client";

import Link from "next/link";
import { ShoppingCart, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { Badge } from "./ui/badge";

function HeaderNav() {
    const { items } = useCart();
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
                href="/"
                className="text-foreground transition-colors hover:text-primary"
            >
                Маркетплейс
            </Link>
            <Link
                href="/trends"
                className="text-foreground transition-colors hover:text-primary flex items-center gap-1"
            >
                <Sparkles className="h-4 w-4 text-accent" />
                Тренды
            </Link>
            <Link
                href="/cart"
                className="text-foreground transition-colors hover:text-primary flex items-center gap-1 relative"
            >
                <ShoppingCart className="h-4 w-4" />
                Корзина
                {totalItems > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-4 h-5 w-5 justify-center p-0">{totalItems}</Badge>
                )}
            </Link>
            <Link
                href="/profile"
                className="text-foreground transition-colors hover:text-primary flex items-center gap-1"
            >
                <User className="h-4 w-4" />
                Профиль
            </Link>
        </nav>
    )
}

export function Header() {
  return (
    <header className={cn("bg-background/95 backdrop-blur-sm sticky top-0 z-40 border-b")}>
      <div className="container mx-auto flex h-16 items-center justify-end px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex">
            <HeaderNav />
        </div>
      </div>
    </header>
  );
}
