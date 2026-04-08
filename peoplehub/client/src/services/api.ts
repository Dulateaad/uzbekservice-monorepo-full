import axios from 'axios';
import type { User, Trip, PriceEstimate, ChatMessage, DriverStats } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ph_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== AUTH ====================

export const authApi = {
  async loginWithTelegram(initData: string) {
    const { data } = await api.post<{
      token: string;
      user: User;
      isNewUser: boolean;
    }>('/auth/telegram', { initData });
    return data;
  },

  async register(payload: {
    role: 'CLIENT' | 'DRIVER';
    phone: string;
    codexAccepted: boolean;
    carBrand?: string;
    carModel?: string;
    carColor?: string;
    carYear?: number;
    licensePlate?: string;
  }) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', payload);
    return data;
  },

  async getMe() {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// ==================== TRIPS ====================

export const tripApi = {
  async create(payload: {
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffAddress: string;
    distanceKm: number;
    estimatedMinutes: number;
  }) {
    const { data } = await api.post<{ trip: Trip; priceEstimate: PriceEstimate }>('/trips', payload);
    return data;
  },

  async getPrice(distanceKm: number, estimatedMinutes: number) {
    const { data } = await api.get<PriceEstimate>('/trips/price', {
      params: { distanceKm, estimatedMinutes },
    });
    return data;
  },

  async getActive() {
    const { data } = await api.get<Trip | null>('/trips/active');
    return data;
  },

  async getHistory(page = 1, limit = 20) {
    const { data } = await api.get<{
      trips: Trip[];
      total: number;
      page: number;
      totalPages: number;
    }>('/trips/history', { params: { page, limit } });
    return data;
  },

  async updateStatus(tripId: string, status: string, cancelReason?: string) {
    const { data } = await api.patch<Trip>(`/trips/${tripId}/status`, {
      status,
      cancelReason,
    });
    return data;
  },

  async reportNoShow(tripId: string) {
    const { data } = await api.post<Trip>(`/trips/${tripId}/no-show`);
    return data;
  },

  async rate(tripId: string, score: number, comment?: string) {
    const { data } = await api.post(`/trips/${tripId}/rate`, { score, comment });
    return data;
  },
};

// ==================== DRIVER ====================

export const driverApi = {
  async goOnline() {
    const { data } = await api.post<{ status: string }>('/driver/go-online');
    return data;
  },

  async goOffline() {
    const { data } = await api.post<{ status: string }>('/driver/go-offline');
    return data;
  },

  async sendLocation(payload: {
    lat: number;
    lng: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    isMockLocation?: boolean;
    timestamp: number;
  }) {
    const { data } = await api.post('/driver/location', payload);
    return data;
  },

  async subscribe() {
    const { data } = await api.post<{
      subscriptionActive: boolean;
      expiresAt: string;
    }>('/driver/subscribe');
    return data;
  },

  async getStats() {
    const { data } = await api.get<DriverStats>('/driver/stats');
    return data;
  },

  async getProfile() {
    const { data } = await api.get('/driver/profile');
    return data;
  },
};

// ==================== CHAT ====================

export const chatApi = {
  async getMessages(tripId: string, page = 1) {
    const { data } = await api.get<ChatMessage[]>(`/chat/${tripId}`, {
      params: { page },
    });
    return data;
  },

  async sendMessage(tripId: string, type: string, content: string, lat?: number, lng?: number) {
    const { data } = await api.post<ChatMessage>(`/chat/${tripId}`, {
      type,
      content,
      lat,
      lng,
    });
    return data;
  },

  async getTemplates() {
    const { data } = await api.get('/chat/templates');
    return data;
  },
};

export default api;
