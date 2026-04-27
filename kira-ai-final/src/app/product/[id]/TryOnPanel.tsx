
"use client";

import { useRef, useState, type ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Sparkles, AlertCircle, Film, Info } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import type { Product, UserProfile } from "@/lib/types";
import { runVirtualTryOnAction, runGenerateCatwalkVideoAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from "@/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";

interface TryOnPanelProps {
    product: Product;
}

const PRIVACY_POLICY_AGREED_KEY = 'kira-privacy-policy-agreed';

export function TryOnPanel({ product }: TryOnPanelProps) {
    const { toast } = useToast();
    const { user, firestore } = useFirebase();

    const [userImage, setUserImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
    const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
    const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false);

    useEffect(() => {
        const agreed = localStorage.getItem(PRIVACY_POLICY_AGREED_KEY);
        if (agreed === 'true') {
            setHasAgreedToPolicy(true);
        }
    }, []);

    const handleAgreeToPolicy = () => {
        localStorage.setItem(PRIVACY_POLICY_AGREED_KEY, 'true');
        setHasAgreedToPolicy(true);
        setShowPrivacyDialog(false);
        toast({ title: "Спасибо!", description: "Теперь вы можете продолжить." });
    };

    const checkPolicyAndExecute = (action: () => void) => {
        if (hasAgreedToPolicy) {
            action();
        } else {
            setShowPrivacyDialog(true);
        }
    };


    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setUserImage(e.target?.result as string);
                setGeneratedImage(null);
                setGeneratedVideo(null);
                setError(null);
                setVideoError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubscribe = () => {
        toast({
            title: "Спасибо!",
            description: "Мы сохранили ваш интерес к раннему доступу PRO и свяжемся, когда откроем приём заявок.",
        });
    };

    const manageCredits = async (type: 'photo' | 'video'): Promise<boolean> => {
        if (!user || !firestore) {
            toast({ title: "Ошибка", description: "Для этой функции требуется авторизация.", variant: "destructive" });
            return false;
        }
        
        const userProfileRef = doc(firestore, 'userProfiles', user.uid);
        const profileSnap = await getDoc(userProfileRef);
        
        if (!profileSnap.exists()) {
            // This case should be rare now as profile is created on login
            toast({ title: "Ошибка", description: "Профиль не найден. Попробуйте перезайти.", variant: "destructive" });
            return false;
        }

        const currentProfile = profileSnap.data() as UserProfile;
        const creditsRemaining = type === 'photo' ? currentProfile.photoCredits : currentProfile.videoCredits;

        if (creditsRemaining <= 0) {
            setShowSubscriptionDialog(true);
            return false;
        }

        await updateDoc(userProfileRef, {
            [`${type}Credits`]: increment(-1),
            updatedAt: new Date().toISOString()
        });

        toast({ title: `Использована 1 ${type === 'photo' ? 'примерка' : 'генерация видео'}` });
        return true;
    }

    const performTryOn = async () => {
        if (!userImage) {
            toast({
                title: "Загрузите фото",
                description: "Пожалуйста, сначала загрузите ваше фото в полный рост.",
                variant: "destructive",
            });
            return;
        }

        const canGenerate = await manageCredits('photo');
        if (!canGenerate) return;

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setGeneratedVideo(null);
        setVideoError(null);

        toast({ title: "KIRA AI создает образ...", description: "Это может занять некоторое время." });

        try {
            const productImageUrl = (product.imageUrls && product.imageUrls[0]) || (product as any).imageUrl;
            if (!productImageUrl) {
                throw new Error("Изображение товара не найдено.");
            }
            const result = await runVirtualTryOnAction(userImage, productImageUrl);

            if (result.error || !result.url) {
                throw new Error(result.error || "Не удалось сгенерировать изображение.");
            }

            setGeneratedImage(result.url);
            toast({ title: "Готово!", description: "Ваш новый образ создан." });
        } catch (err: any) {
            setError(err.message || "Произошла неизвестная ошибка.");
            toast({
                title: "Ошибка виртуальной примерки",
                description: err.message || "Не удалось создать образ. Попробуйте другое фото.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTryOn = () => {
        checkPolicyAndExecute(performTryOn);
    };

    const performGenerateVideo = async () => {
        if (!generatedImage) {
            toast({
                title: "Сначала создайте образ",
                description: "Сначала нужно сгенерировать изображение с примеркой.",
                variant: "destructive",
            });
            return;
        }

        const canGenerate = await manageCredits('video');
        if (!canGenerate) return;

        setIsVideoLoading(true);
        setVideoError(null);
        setGeneratedVideo(null);

        toast({ title: "KIRA AI создает видео-подиум...", description: "Это может занять больше минуты." });

        try {
            const result = await runGenerateCatwalkVideoAction(generatedImage);

            if (result.error || !result.url) {
                throw new Error(result.error || "Не удалось сгенерировать видео.");
            }

            setGeneratedVideo(result.url);
            toast({ title: "Видео готово!", description: "Ваше дефиле создано." });
        } catch (err: any) {
            setVideoError(err.message || "Произошла неизвестная ошибка при создании видео.");
            toast({
                title: "Ошибка генерации видео",
                description: err.message || "Не удалось создать видео. Попробуйте еще раз.",
                variant: "destructive",
            });
        } finally {
            setIsVideoLoading(false);
        }
    };

    const handleGenerateVideo = () => {
        checkPolicyAndExecute(performGenerateVideo);
    }

    return (
        <>
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <Sparkles className="text-accent" />
                    Виртуальная примерка
                </CardTitle>
                <CardDescription>
                    Загрузите свое фото в полный рост и посмотрите, как этот товар будет смотреться на вас.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Требования к фото для примерки</AlertTitle>
                    <AlertDescription className="space-y-3">
                        <p>
                            Чтобы примерка выглядела максимально реалистично, загрузите фото, которое соответствует
                            этим условиям:
                        </p>
                        <ul className="list-none space-y-1.5 pl-0 text-sm">
                            <li>• Фото должно быть сделано при хорошем, равномерном освещении (без сильных теней и пересвета)</li>
                            <li>• Лицо должно быть хорошо видно, без очков, масок и предметов, закрывающих его</li>
                            <li>• Смотрите прямо в камеру, не поворачивайте голову в сторону</li>
                            <li>• Фото должно быть чётким, без размытия</li>
                            <li>• На фото должен быть только один человек</li>
                            <li>• Фон должен быть простой, без лишних объектов</li>
                            <li>• Не используйте фото с фильтрами или сильной обработкой</li>
                        </ul>
                        <p className="text-sm">
                            Это поможет KIRA создать более точную и реалистичную примерку.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-3 mt-1">
                            Загружая фото, вы соглашаетесь с обработкой данных и нашей{' '}
                            <button
                                type="button"
                                className="text-primary underline underline-offset-2 hover:text-primary/90 font-medium"
                                onClick={() => setShowPrivacyDialog(true)}
                            >
                                Политикой конфиденциальности
                            </button>
                        </p>
                    </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2">
                        <Label htmlFor="user-photo">Ваше фото</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="user-photo"
                                type="file"
                                accept="image/png, image/jpeg"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                {userImage ? "Изменить фото" : "Загрузить фото"}
                            </Button>
                        </div>
                        {userImage && (
                             <div className="mt-2 relative aspect-[4/5] w-full max-w-sm rounded-md overflow-hidden border">
                                <Image src={userImage} alt="Пользователь" fill className="object-cover"/>
                            </div>
                        )}
                    </div>
                     <div className="relative aspect-[4/5] w-full max-w-sm rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                        {(() => {
                            if (isLoading || isVideoLoading) {
                                return (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-10">
                                        <Loader2 className="h-10 w-10 animate-spin mb-4" />
                                        <p>{isVideoLoading ? 'Создаем ваше дефиле...' : 'Магия в процессе...'}</p>
                                    </div>
                                );
                            }
                            if (videoError) {
                                return (
                                    <Alert variant="destructive" className="m-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Ошибка видео</AlertTitle>
                                        <AlertDescription>{videoError}</AlertDescription>
                                    </Alert>
                                );
                            }
                            if (error) {
                                return (
                                    <Alert variant="destructive" className="m-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Ошибка примерки</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                );
                            }
                            if (generatedVideo) {
                                return <video src={generatedVideo} autoPlay loop muted controls className="object-cover w-full h-full" />;
                            }
                            if (generatedImage) {
                                return <Image src={generatedImage} alt="Результат примерки" fill className="object-cover"/>;
                            }
                            return (
                                <div className="text-center text-muted-foreground p-4">
                                    <p>Здесь появится результат вашей примерки</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                 <div className="flex flex-col gap-4">
                    <Button onClick={handleTryOn} disabled={isLoading || isVideoLoading || !userImage} size="lg" className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Генерация...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Примерить
                            </>
                        )}
                    </Button>
                    {generatedImage && !isLoading && !error && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Нажмите кнопку, чтобы создать видео, где вы проходите как на подиуме в этом образе.
                                KIRA сгенерирует реалистичную анимацию на основе вашего фото, чтобы вы могли увидеть,
                                как образ выглядит в движении.
                            </p>
                            <Button onClick={handleGenerateVideo} disabled={isVideoLoading} size="lg" className="w-full" variant="outline">
                                {isVideoLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Создание видео...
                                    </>
                                ) : (
                                    <>
                                        <Film className="mr-2 h-5 w-5" />
                                        Создать видео-подиум
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        <SubscriptionDialog
            isOpen={showSubscriptionDialog}
            onOpenChange={setShowSubscriptionDialog}
            onSubscribe={handleSubscribe}
        />
        <PrivacyPolicyDialog
            isOpen={showPrivacyDialog}
            onOpenChange={setShowPrivacyDialog}
            onAgree={handleAgreeToPolicy}
        />
        </>
    );
}
