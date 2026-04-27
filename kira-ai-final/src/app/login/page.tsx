
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { Loader2, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import type { UserProfile } from "@/lib/types";
import {
  initTelegramWebApp,
  waitForTelegramUser,
  isInsideTelegramWebApp,
} from "@/lib/telegram-webapp";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email."),
  password: z.string().min(1, "Пароль не может быть пустым."),
});

const registerSchema = z.object({
  displayName: z.string().min(2, "Имя должно быть не менее 2 символов."),
  email: z.string().email("Неверный формат email."),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов."),
  agreeToPolicy: z.literal(true, {
    errorMap: () => ({ message: "Вы должны принять политику конфиденциальности." }),
  }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const { auth, firestore, user: currentUser } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const autoTelegramAttempted = useRef(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      displayName: "", 
      email: "", 
      password: "", 
      agreeToPolicy: false as any 
    },
  });

  const handleTelegramLogin = useCallback(async () => {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      initTelegramWebApp();
      const tgUser = await waitForTelegramUser();

      if (!tgUser) {
        if (!isInsideTelegramWebApp()) {
          throw new Error(
            "Вход через Telegram доступен только внутри приложения Telegram. Откройте KIRA из меню бота или по кнопке «Открыть» в чате."
          );
        }
        throw new Error(
          "Telegram ещё не передал данные профиля. Закройте мини-приложение и откройте снова из бота, либо войдите по email."
        );
      }

      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      const userProfileRef = doc(firestore, "userProfiles", user.uid);
      const profileSnap = await getDoc(userProfileRef);

      if (!profileSnap.exists()) {
        const now = new Date().toISOString();
        const newUserProfile: UserProfile = {
            id: user.uid,
            uid: user.uid,
            displayName: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
            email: "",
            photoURL: tgUser.photo_url || "",
            role: 'user',
            photoCredits: 5,
            videoCredits: 10,
            subscriptionType: 'free',
            telegramId: tgUser.id,
            hasAgreedToPolicy: false,
            createdAt: now,
            updatedAt: now
        };
        await setDoc(userProfileRef, newUserProfile);
      }

      toast({ title: "Вход через Telegram выполнен!" });
      router.push("/");
    } catch (error: any) {
      console.error("Telegram Login Error:", error);
      toast({
        title: "Ошибка Telegram",
        description: error.message || "Не удалось войти через Telegram.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsAutoLoggingIn(false);
    }
  }, [auth, firestore, router, toast]);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tryAuto = async () => {
      if (currentUser || isLoading || isAutoLoggingIn || autoTelegramAttempted.current) return;
      initTelegramWebApp();
      const tgUser = await waitForTelegramUser(800);
      if (cancelled || !tgUser || currentUser) return;
      autoTelegramAttempted.current = true;
      setIsAutoLoggingIn(true);
      handleTelegramLogin();
    };
    void tryAuto();
    return () => {
      cancelled = true;
    };
  }, [currentUser, handleTelegramLogin, isLoading, isAutoLoggingIn]);

  const onLoginSubmit = async (data: LoginValues) => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Вход выполнен успешно!" });
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: "Неверный email или пароль.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName: data.displayName });
      
      const userProfileRef = doc(firestore, "userProfiles", user.uid);
      const now = new Date().toISOString();
      const newUserProfile: UserProfile = {
          id: user.uid,
          uid: user.uid,
          displayName: data.displayName,
          email: user.email || '',
          photoURL: user.photoURL || '',
          role: 'user',
          photoCredits: 5,
          videoCredits: 10,
          subscriptionType: 'free',
          hasAgreedToPolicy: true,
          createdAt: now,
          updatedAt: now
      };
      await setDoc(userProfileRef, newUserProfile);

      toast({ title: "Регистрация прошла успешно!" });
      router.push("/");
    } catch (error: any) {
      let message = "Произошла ошибка при регистрации.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Этот email уже используется. Войдите в существующий аккаунт.";
      }
      toast({
        title: "Ошибка регистрации",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoLoggingIn) {
    return (
      <div className="container mx-auto flex min-h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Автоматический вход через Telegram...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-4">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Вход</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isLoading}>Войти</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Регистрация</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField control={registerForm.control} name="displayName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пароль</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="agreeToPolicy" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Я принимаю <button type="button" className="text-primary hover:underline" onClick={() => setShowPrivacyDialog(true)}>Политику конфиденциальности</button>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : "Зарегистрироваться"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Или войти через</span></div>
        </div>

        <Button 
          variant="outline" 
          className="w-full bg-[#0088cc] text-white hover:bg-[#0077b5] hover:text-white border-none" 
          onClick={handleTelegramLogin}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : <MessageCircle className="mr-2 h-5 w-5" />}
          Войти через Telegram
        </Button>
      </div>

      <PrivacyPolicyDialog isOpen={showPrivacyDialog} onOpenChange={setShowPrivacyDialog} onAgree={() => registerForm.setValue('agreeToPolicy', true)} />
    </div>
  );
}
