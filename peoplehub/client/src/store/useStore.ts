import { create } from 'zustand';
import type { User, Trip } from '../types';
import type { ProductId } from '../config/features';

const SESSION_VERSION = '2';
const storedVersion = localStorage.getItem('ph_session_v');
if (storedVersion !== SESSION_VERSION) {
  localStorage.removeItem('ph_userId');
  localStorage.removeItem('ph_product');
  localStorage.removeItem('ph_branch');
  localStorage.setItem('ph_session_v', SESSION_VERSION);
}

interface AppState {
  // Auth
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;

  // Product & Branch (Router architecture)
  activeProduct: ProductId | null;
  activeBranch: string | null;
  setActiveProduct: (product: ProductId) => void;
  setActiveBranch: (branch: string) => void;

  // Trip
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;

  // Driver location
  driverLocation: { lat: number; lng: number; heading?: number } | null;
  setDriverLocation: (loc: { lat: number; lng: number; heading?: number } | null) => void;

  // UI
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  userId: localStorage.getItem('ph_userId'),
  isAuthenticated: !!localStorage.getItem('ph_userId'),
  setAuth: (user) => {
    localStorage.setItem('ph_userId', user.id);
    set({ user, userId: user.id, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('ph_userId');
    set({ user: null, userId: null, isAuthenticated: false, activeProduct: null, activeBranch: null });
  },

  // Product & Branch
  activeProduct: (localStorage.getItem('ph_product') as ProductId) || null,
  activeBranch: localStorage.getItem('ph_branch') || null,
  setActiveProduct: (product) => {
    localStorage.setItem('ph_product', product);
    set({ activeProduct: product });
  },
  setActiveBranch: (branch) => {
    localStorage.setItem('ph_branch', branch);
    set({ activeBranch: branch });
  },

  // Trip
  activeTrip: null,
  setActiveTrip: (trip) => set({ activeTrip: trip }),

  // Driver location
  driverLocation: null,
  setDriverLocation: (loc) => set({ driverLocation: loc }),

  // UI
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
