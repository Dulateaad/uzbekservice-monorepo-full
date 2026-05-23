export type UserRole = "user" | "worker" | "admin";

export interface GreenflowersUser {
  id: number;
  /** Firebase Auth UID — для Firestore-корзины и заказов без sprayApi */
  firebaseUid?: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  city?: string;
  company_name?: string;
  is_active?: boolean;
  created_at?: string;
}
