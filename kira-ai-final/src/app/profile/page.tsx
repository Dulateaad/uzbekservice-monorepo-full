
'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Zap, LogOut } from 'lucide-react';
import { FirebaseClientProvider, useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

function ProfileManager() {
  const { user: firebaseUser, auth, firestore, isUserLoading: isFirebaseLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, 'userProfiles', firebaseUser.uid);
  }, [firestore, firebaseUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isFirebaseLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [isFirebaseLoading, firebaseUser, router]);

  const handleLogout = async () => {
    if (!auth) return;
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast({ title: "Вы вышли из системы" });
      router.push('/login');
    } catch (error: any) {
      toast({ 
        title: "Ошибка выхода", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isLoading = isFirebaseLoading || isProfileLoading;

  if (isLoading || !firebaseUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = userProfile?.displayName || firebaseUser?.displayName || 'Пользователь';
  const photoURL = userProfile?.photoURL || firebaseUser?.photoURL || '';
  const email = userProfile?.email || firebaseUser?.email;

  return (
    <Card>
      <CardHeader className="text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={photoURL} alt="User avatar" />
          <AvatarFallback>
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <div className='flex items-center justify-center gap-2'>
            <CardTitle className="text-3xl font-headline">{displayName}</CardTitle>
            {userProfile?.subscriptionType === 'pro' && <Badge><Zap className="h-3 w-3 mr-1" />PRO</Badge>}
        </div>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" value={displayName} disabled />
        </div>
        {email && (
            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
            </div>
        )}
        
        <div>
            <Label className="mb-2 block">Ваши кредиты</Label>
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center bg-secondary/50">
                    <CardTitle className="font-bold text-2xl">{userProfile?.photoCredits ?? '-'}</CardTitle>
                    <CardDescription>Примерок фото</CardDescription>
                </Card>
                <Card className="p-4 text-center bg-secondary/50">
                    <CardTitle className="font-bold text-2xl">{userProfile?.videoCredits ?? '-'}</CardTitle>
                    <CardDescription>Генераций видео</CardDescription>
                </Card>
            </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Выйти
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {userProfile ? 'Для пополнения кредитов используйте виртуальную примерку.' : 'Ваш профиль будет создан после первой генерации.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <FirebaseClientProvider>
      <div className="container mx-auto max-w-2xl py-6 sm:py-12 animate-fade-in-up">
        <ProfileManager />
      </div>
    </FirebaseClientProvider>
  );
}
