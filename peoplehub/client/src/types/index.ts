// ==================== USER ====================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: 'CLIENT' | 'DRIVER';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  codexAccepted: boolean;
  avatarUrl?: string;
  /** Селфи загружено через приложение (камера) — нужно для линии водителя */
  selfieAvatarAt?: unknown;
  trustScore: number;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  gender?: Gender;
  driverProfile?: DriverProfile;
}

export interface DriverProfile {
  carBrand: string;
  carModel: string;
  carColor: string;
  carYear: number;
  licensePlate: string;
  driverStatus: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'ARRIVING';
  isVerified: boolean;
  subscriptionActive: boolean;
  /** Публичные URL фото авто с верификации (для пассажира) */
  vehiclePhotoUrls?: Record<string, string>;
}

// ==================== TRIP ====================

export type TripStatus =
  | 'SEARCHING'        // Client posted, waiting for driver bids
  | 'BIDDING'          // Drivers are bidding, client reviewing
  | 'DRIVER_ASSIGNED'  // Client accepted a bid
  | 'DRIVER_ARRIVING'  // Driver en route to pickup
  | 'DRIVER_ARRIVED'   // Driver at pickup point
  | 'IN_PROGRESS'      // Trip in progress
  | 'COMPLETED'        // Trip finished
  | 'CANCELLED'        // Cancelled by either party
  | 'NO_DRIVER';       // No drivers responded

// Legacy statuses kept for compatibility
export type LegacyTripStatus = TripStatus | 'WAITING_PAYMENT' | 'PAID';

export type TripType = 'CITY' | 'INTERCITY';

export interface Trip {
  id: string;
  clientId: string;
  driverId?: string;
  tripType?: TripType;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  distanceKm: number;
  estimatedMinutes: number;
  price: number;
  finalPrice?: number;
  status: TripStatus;
  bidsCount?: number;
  femaleDriverOnly?: boolean;
  clientNote?: string;
  paymentMethod?: 'CASH';
  // Intercity-specific
  departureCity?: string;
  destinationCity?: string;
  scheduledAt?: string;
  seatsRequested?: number;
  pricePerSeat?: number;
  fullCar?: boolean;
  hasBaggage?: boolean;
  estimatedHours?: number;
  // Timestamps
  driverAssignedAt?: string;
  driverArrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  actualMinutes?: number;
  client?: UserPreview;
  driver?: DriverPreview;
}

// ==================== BIDS (Auction) ====================

export interface Bid {
  id: string;
  tripId: string;
  driverId: string;
  price: number;           // Driver's proposed price
  message?: string;        // Optional short message
  etaMinutes?: number;     // Estimated arrival in minutes
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  driver: DriverPreview;
}

// ==================== PREVIEWS ====================

export interface UserPreview {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  trustScore?: { score: number };
}

export interface DriverPreview extends UserPreview {
  driverProfile?: {
    carBrand: string;
    carModel: string;
    carColor: string;
    carYear?: number;
    licensePlate: string;
    currentLat?: number;
    currentLng?: number;
    vehiclePhotoUrls?: Record<string, string>;
  };
}

// ==================== PRICE ====================

export interface PriceEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  price: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
  };
}

// ==================== CHAT ====================

export type MessageType = 'TEXT' | 'VOICE' | 'LOCATION' | 'TEMPLATE' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  type: MessageType;
  content: string;
  lat?: number;
  lng?: number;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    role: string;
  };
}

export interface QuickTemplate {
  id: string;
  text: string;
}

// ==================== DRIVER STATS ====================

export interface DriverStats {
  totalTrips: number;
  todayTrips: number;
  totalEarnings: number;
  todayEarnings: number;
  trustScore: number;
}

// ==================== TELEGRAM ====================

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  ready(): void;
  expand(): void;
  close(): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
}
