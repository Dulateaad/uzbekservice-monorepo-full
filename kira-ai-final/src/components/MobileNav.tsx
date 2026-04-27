"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { Badge } from "./ui/badge";

function NavItems() {
    const { items } = useCart();
    const pathname = usePathname();
    const isDashboardPage = pathname.startsWith('/dashboard');

    const navItems = [
      { href: "/", label: "Маркет", icon: Home },
      { href: "/trends", label: "Тренды", icon: Sparkles },
      { href: "/cart", label: "Корзина", icon: ShoppingCart },
      { href: "/profile", label: "Профиль", icon: User },
    ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[];
    
    return (
         <div className={cn(
            "md:hidden fixed bottom-4 left-0 right-0 z-50 flex justify-center",
            isDashboardPage && "hidden"
         )}>
            <div className="w-auto mx-auto bg-background/70 backdrop-blur-lg border border-border rounded-full shadow-lg overflow-hidden">
                <nav className="flex items-center justify-around h-16 gap-1 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const isCart = item.href === '/cart';
                    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

                    return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                        "relative flex flex-col items-center justify-center h-14 w-14 text-xs transition-colors rounded-full",
                        isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:bg-secondary/50"
                        )}
                    >
                        <item.icon className="h-5 w-5 mb-1" />
                        <span className="text-[10px] leading-tight text-center">{item.label}</span>
                        {isCart && totalItems > 0 && (
                             <Badge variant="destructive" className="absolute top-1 right-1 h-4 w-4 justify-center p-0 text-[10px]">{totalItems}</Badge>
                        )}
                    </Link>
                    );
                })}
                </nav>
            </div>
        </div>
    )
}

export function MobileNav() {
  return (
    <NavItems />
  );
}
