'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DeprecatedPage() {
  return (
    <div className="container mx-auto max-w-lg py-12 text-center flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card/80 backdrop-blur-sm w-full">
            <CardHeader>
                <CardTitle>Эта функция временно недоступна</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="mb-6 text-muted-foreground">Мы работаем над улучшением этого раздела. Загляните позже!</p>
                <Button asChild>
                    <Link href="/">Вернуться на главную</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
