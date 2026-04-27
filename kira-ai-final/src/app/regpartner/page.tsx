
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useToast } from "@/hooks/use-toast";
import { FirebaseClientProvider, useFirebase } from "@/firebase";
import { Loader2, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import type { UserProfile } from "@/lib/types";

const partnerSchema = z.object({
  displayName: z.string().min(2, "Название бренда должно быть не менее 2 символов."),
  email: z.string().email("Неверный формат email."),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов."),
  agreeToPolicy: z.literal(true, {
    errorMap: () => ({ message: "Вы должны принять политику конфиденциальности." }),
  }),
});

type PartnerValues = z.infer<typeof partnerSchema>;

function RegisterPartnerComponent() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  const form = useForm<PartnerValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { displayName: "", email: "", password: "", agreeToPolicy: false as any },
  });

  const onSubmit = async (data: PartnerValues) => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
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
          role: 'partner',
          photoCredits: 10,
          videoCredits: 10,
          subscriptionType: 'free',
          hasAgreedToPolicy: true,
          createdAt: now,
          updatedAt: now
      };
      await setDoc(userProfileRef, newUserProfile);

      toast({ title: "Регистрация партнера завершена!" });
      router.push("/dashboard");
    } catch (error: any) {
      let message = "Произошла ошибка при регистрации партнера.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Этот email уже зарегистрирован как партнер или пользователь.";
      } else {
        message = error.message;
      }
      toast({ title: "Ошибка регистрации", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Регистрация Партнера</CardTitle>
          <CardDescription>Создайте аккаунт бренда или дизайнера, чтобы управлять своим каталогом.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Название бренда</FormLabel>
                  <FormControl><Input placeholder="Например: MyBrand Couture" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="agreeToPolicy" render={({ field }) => (
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
                {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                Зарегистрировать бренд
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <PrivacyPolicyDialog isOpen={showPrivacyDialog} onOpenChange={setShowPrivacyDialog} onAgree={() => form.setValue('agreeToPolicy', true)} />
    </div>
  );
}

export default function RegisterPartnerPage() {
    return (
        <FirebaseClientProvider>
            <RegisterPartnerComponent />
        </FirebaseClientProvider>
    );
}
