
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  category: string;
  sizes: string[];
  colors: string[];
  ownerId: string;
};

export type UserProfile = {
  id: string; // Required for Firestore Rules: request.resource.data.id == userId
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'partner';
  photoCredits: number;
  videoCredits: number;
  subscriptionType: 'free' | 'pro';
  telegramId?: number;
  hasAgreedToPolicy?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = Product & {
    quantity: number;
    size: string;
};
