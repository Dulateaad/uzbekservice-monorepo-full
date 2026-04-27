
"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Sparkles, Trophy, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { runGenerateTrendVideoAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider, useFirebase } from "@/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";

function TrendsContent() {
    const { toast } = useToast();
    const { user, firestore } = useFirebase();

    const [selectedTheme, setSelectedTheme] = useState<'bridgerton' | 'f1' | null>(null);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
    const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setUserImage(e.target?.result as string);
                setGeneratedVideo(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const manageCredits = async (): Promise<boolean> => {
        if (!user || !firestore) {
            toast({ title: "Ошибка", description: "Требуется авторизация.", variant: "destructive" });
            return false;
        }
        const userProfileRef = doc(firestore, 'userProfiles', user.uid);
        const profileSnap = await getDoc(userProfileRef);
        if (!profileSnap.exists()) return false;

        const currentProfile = profileSnap.data() as UserProfile;
        if (currentProfile.videoCredits <= 0) {
            setShowSubscriptionDialog(true);
            return false;
        }

        await updateDoc(userProfileRef, {
            videoCredits: increment(-1),
            updatedAt: new Date().toISOString()
        });
        return true;
    }

    const handleGenerate = async () => {
        if (!userImage || !selectedTheme) {
            toast({ title: "Ошибка", description: "Загрузите фото и выберите тему.", variant: "destructive" });
            return;
        }

        const canGenerate = await manageCredits();
        if (!canGenerate) return;

        setIsLoading(true);
        setGeneratedVideo(null);
        toast({ title: "KIRA AI создает видео...", description: "Это может занять до 2 минут." });

        try {
            const result = await runGenerateTrendVideoAction({
                imageDataUri: userImage,
                theme: selectedTheme
            });

            if (result.error || !result.url) throw new Error(result.error || "Ошибка генерации.");

            setGeneratedVideo(result.url);
            toast({ title: "Готово!", description: "Ваше видео в тренде создано." });
        } catch (err: any) {
            toast({ title: "Ошибка", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 space-y-8 animate-fade-in-up">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-headline font-bold">AI Тренды</h1>
                <p className="text-muted-foreground">Станьте героем любимого фильма или гонки с помощью Veo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                    className={cn("cursor-pointer transition-all border-2", selectedTheme === 'bridgerton' ? "border-primary bg-primary/5" : "hover:border-primary/50")}
                    onClick={() => setSelectedTheme('bridgerton')}
                >
                    <CardHeader className="text-center">
                        <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                        <CardTitle className="font-headline">Бриджертоны</CardTitle>
                        <CardDescription>Элегантность Регентства</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground pb-6">
                        Погрузитесь в атмосферу светских балов и романтики XIX века.
                    </CardContent>
                </Card>

                <Card 
                    className={cn("cursor-pointer transition-all border-2", selectedTheme === 'f1' ? "border-primary bg-primary/5" : "hover:border-primary/50")}
                    onClick={() => setSelectedTheme('f1')}
                >
                    <CardHeader className="text-center">
                        <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
                        <CardTitle className="font-headline">Формула 1</CardTitle>
                        <CardDescription>Скорость и триумф</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground pb-6">
                        Станьте легендарным гонщиком в объективе спортивной хроники.
                    </CardContent>
                </Card>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Загружая фото, вы соглашаетесь с обработкой данных и нашей{' '}
                            <button
                                type="button"
                                className="text-primary underline underline-offset-2 hover:text-primary/90 font-medium"
                                onClick={() => setShowPrivacyDialog(true)}
                            >
                                Политикой конфиденциальности
                            </button>
                        </p>
                        <Label>Загрузите фото для видео</Label>
                        <div className="flex flex-col items-center gap-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                                <Camera className="mr-2 h-4 w-4" />
                                {userImage ? "Сменить фото" : "Загрузить фото"}
                            </Button>
                        </div>
                    </div>

                    {generatedVideo ? (
                        <div className="aspect-[9/16] w-full max-w-sm mx-auto rounded-lg overflow-hidden border bg-black shadow-xl">
                            <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        isLoading && (
                            <div className="aspect-[9/16] w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center text-center p-8">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                <p className="font-semibold">KIRA AI создает шедевр...</p>
                                <p className="text-xs text-muted-foreground mt-2">Обычно это занимает около 60-90 секунд</p>
                            </div>
                        )
                    )}

                    <Button 
                        size="lg" 
                        className="w-full h-14 text-lg" 
                        onClick={handleGenerate} 
                        disabled={isLoading || !userImage || !selectedTheme}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6" />}
                        Создать AI Видео
                    </Button>
                </CardContent>
            </Card>

            <SubscriptionDialog
                isOpen={showSubscriptionDialog}
                onOpenChange={setShowSubscriptionDialog}
                onSubscribe={() =>
                    toast({
                        title: "Спасибо!",
                        description:
                            "Мы сохранили ваш интерес к раннему доступу PRO и свяжемся, когда откроем приём заявок.",
                    })
                }
            />
            <PrivacyPolicyDialog
                isOpen={showPrivacyDialog}
                onOpenChange={setShowPrivacyDialog}
                onAgree={() => setShowPrivacyDialog(false)}
            />
        </div>
    );
}

export default function TrendsPage() {
    return (
        <FirebaseClientProvider>
            <TrendsContent />
        </FirebaseClientProvider>
    );
}
