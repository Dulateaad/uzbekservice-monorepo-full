
'use client';

import { useEffect, useState } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PrivacyPolicyDialog } from './PrivacyPolicyDialog';
import type { UserProfile } from '@/lib/types';
import Loading from '@/app/loading';

/**
 * PrivacyGuard checks if the authenticated user has agreed to the privacy policy.
 * If not, it forces them to accept it before showing any other content.
 * It also ensures the profile exists upon agreement.
 */
export function PrivacyGuard({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const [showDialog, setShowDialog] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'userProfiles', user.uid);
  }, [firestore, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // If user is logged in, and profile check is finished
    if (!isUserLoading && !isProfileLoading && user) {
      // If profile is missing OR policy is not agreed
      if (!profile || profile.hasAgreedToPolicy !== true) {
        setShowDialog(true);
      } else {
        setShowDialog(false);
      }
    } else if (!user && !isUserLoading) {
      setShowDialog(false);
    }
  }, [user, profile, isUserLoading, isProfileLoading]);

  const handleAgree = async () => {
    if (!user || !firestore) return;
    try {
      const userProfileRef = doc(firestore, 'userProfiles', user.uid);
      const now = new Date().toISOString();
      
      // Use setDoc with merge: true to ensure the document exists and fields are populated
      // We provide 10 video credits as default for everyone agreeing now
      await setDoc(userProfileRef, {
        id: user.uid,
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || 'Пользователь',
        email: profile?.email || user.email || '',
        photoURL: profile?.photoURL || user.photoURL || '',
        role: profile?.role || 'user',
        photoCredits: profile?.photoCredits ?? 5,
        videoCredits: profile?.videoCredits ?? 10,
        subscriptionType: profile?.subscriptionType || 'free',
        hasAgreedToPolicy: true,
        createdAt: profile?.createdAt || now,
        updatedAt: now
      }, { merge: true });

      setShowDialog(false);
    } catch (error) {
      console.error("Failed to update policy agreement:", error);
    }
  };

  // While loading auth or profile, show a spinner to prevent UI jumping
  if (isUserLoading || (user && isProfileLoading)) {
    return <Loading />;
  }

  return (
    <>
      {children}
      <PrivacyPolicyDialog 
        isOpen={showDialog} 
        onOpenChange={() => {}} // Forced: cannot close by clicking outside
        onAgree={handleAgree}
      />
    </>
  );
}
