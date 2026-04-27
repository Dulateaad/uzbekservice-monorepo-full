import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB7z8VimBp_-eP8iIKkvW_9cak6zNqIfPg",
  authDomain: "taxi-eb8b7.firebaseapp.com",
  projectId: "taxi-eb8b7",
  storageBucket: "taxi-eb8b7.firebasestorage.app",
  messagingSenderId: "914129229231",
  appId: "1:914129229231:web:12f3bf910f1ababb11cb5a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

/** Результат OCR с Cloud Function (Document AI + Vision на сервере, без 401/403) */
export interface OcrResultFromFunction {
  text: string;
  entities: Array<{ type: string; mentionText: string; confidence: number }>;
  labels: Array<{ description: string; score: number }>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** URL API-функции (Express с CORS) — обход CORS callable */
const API_BASE =
  import.meta.env.VITE_FUNCTIONS_URL ||
  `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/api`;

/** Вызов OCR через HTTP API (Express, CORS разрешён — нет блокировки и 401/403 от ключа в браузере) */
export async function processVerificationImageViaFunction(
  file: File,
  type: "techPassport" | "license" | "photo"
): Promise<OcrResultFromFunction | null> {
  try {
    const base64 = await fileToBase64(file);
    const mimeType = file.type || "image/jpeg";
    const res = await fetch(`${API_BASE}/processVerificationImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType, type }),
    });
    if (!res.ok) {
      console.warn("processVerificationImageViaFunction status:", res.status);
      return null;
    }
    const data = (await res.json()) as OcrResultFromFunction;
    return data;
  } catch (err) {
    console.warn("processVerificationImageViaFunction failed:", err);
    return null;
  }
}

// ==================== AUTH ====================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export async function loginWithTelegram(tgUser: TelegramUser) {
  const userId = `tg_${tgUser.id}`;
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  let isNewUser = false;

  if (!snap.exists()) {
    isNewUser = true;
    await setDoc(userRef, {
      telegramId: String(tgUser.id),
      telegramName: tgUser.username || null,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || null,
      phone: null,
      role: "CLIENT",
      status: "ACTIVE",
      codexAccepted: false,
      avatarUrl: tgUser.photo_url || null,
      trustScore: 4.5,
      totalTrips: 0,
      totalRatings: 0,
      createdAt: serverTimestamp(),
    });
  }

  const userData = isNewUser
    ? { role: "CLIENT", codexAccepted: false, trustScore: 4.5, firstName: tgUser.first_name, lastName: tgUser.last_name, phone: null, status: "ACTIVE", avatarUrl: tgUser.photo_url || null }
    : snap.data()!;

  return {
    user: {
      id: userId,
      telegramId: String(tgUser.id),
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      codexAccepted: userData.codexAccepted,
      trustScore: userData.trustScore ?? 4.5,
      phone: userData.phone,
      status: userData.status,
      avatarUrl: userData.avatarUrl,
      selfieAvatarAt: (userData as any).selfieAvatarAt,
      driverProfile: userData.driverProfile || null,
    },
    isNewUser,
  };
}

/**
 * Сбросить профиль пользователя — codexAccepted = false.
 * При следующем входе снова покажется выбор роли и регистрация.
 */
export async function updateUserCity(userId: string, city: string, cityLat: number, cityLng: number) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    city,
    cityLat,
    cityLng,
    updatedAt: serverTimestamp(),
  });
}

/** Upload avatar (camera-only selfie), update user.avatarUrl. */
export async function uploadAvatar(userId: string, imageBlob: Blob): Promise<string> {
  const path = `avatars/${userId}_${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, imageBlob);
    task.on("state_changed", () => {}, reject, () => resolve());
  });
  const url = await getDownloadURL(storageRef);
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    avatarUrl: url,
    selfieAvatarAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return url;
}

/** Человекочитаемый вид марки/модели из распознанного текста */
function prettifyVehicleField(s: string): string {
  if (!s?.trim()) return "";
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toLocaleUpperCase("ru-RU") + w.slice(1).toLocaleLowerCase("ru-RU") : ""))
    .join(" ");
}

function isVerifiedFlag(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

async function latestVerificationRequestStatus(driverId: string): Promise<string | null> {
  try {
    const q = query(
      collection(db, "verification_requests"),
      where("driverId", "==", driverId),
      orderBy("submittedAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const s = (snap.docs[0].data() as { status?: string }).status;
    return typeof s === "string" ? s : null;
  } catch {
    return null;
  }
}

export async function resetUserProfile(userId: string) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    codexAccepted: false,
    updatedAt: serverTimestamp(),
  });
}

export async function resetAllUsersCodex(): Promise<number> {
  const snap = await getDocs(collection(db, "users"));
  let count = 0;
  const batchSize = 500;
  let batch = writeBatch(db);
  let inBatch = 0;

  for (const d of snap.docs) {
    if (d.data().codexAccepted) {
      batch.update(d.ref, { codexAccepted: false });
      inBatch++;
      count++;
      if (inBatch >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        inBatch = 0;
      }
    }
  }
  if (inBatch > 0) await batch.commit();
  return count;
}

export async function registerUser(
  userId: string,
  data: {
    role: string;
    phone: string;
    codexAccepted: boolean;
    personalDataConsent?: boolean;
    itPlatformAcknowledged?: boolean;
    city?: string;
    cityLat?: number;
    cityLng?: number;
    gender?: string;
    carBrand?: string;
    carModel?: string;
    carColor?: string;
    carYear?: number;
    licensePlate?: string;
  }
) {
  const userRef = doc(db, "users", userId);
  const existingSnap = await getDoc(userRef);
  const prev = existingSnap.exists() ? existingSnap.data() : null;
  const prevDp = prev?.driverProfile && typeof prev.driverProfile === "object" ? prev.driverProfile : null;

  const update: any = {
    role: data.role,
    phone: data.phone,
    codexAccepted: true,
    codexAcceptedAt: serverTimestamp(),
    personalDataConsent: data.personalDataConsent || false,
    personalDataConsentAt: data.personalDataConsent ? serverTimestamp() : null,
    itPlatformAcknowledged: data.itPlatformAcknowledged || false,
    city: data.city || "",
    cityLat: data.cityLat || 0,
    cityLng: data.cityLng || 0,
    gender: data.gender || "",
  };

  if (data.role === "DRIVER") {
    let wasVerified = isVerifiedFlag(prevDp?.isVerified);
    if (!wasVerified) {
      const vStatus = await latestVerificationRequestStatus(userId);
      if (vStatus === "approved") wasVerified = true;
    }
    update.driverProfile = {
      ...(prevDp || {}),
      carBrand: (data.carBrand ?? prevDp?.carBrand) || "",
      carModel: (data.carModel ?? prevDp?.carModel) || "",
      carColor: (data.carColor ?? prevDp?.carColor) || "",
      carYear: data.carYear ?? prevDp?.carYear ?? 2020,
      licensePlate: (data.licensePlate ?? prevDp?.licensePlate) || "",
      driverStatus: "OFFLINE",
      isVerified: wasVerified,
      subscriptionActive: prevDp?.subscriptionActive !== false,
    };
    if (!wasVerified) {
      update.driverProfile.isVerified = false;
      update.driverProfile.subscriptionActive = true;
    }
    update.driverProfile.currentLat = (prevDp as any)?.currentLat ?? null;
    update.driverProfile.currentLng = (prevDp as any)?.currentLng ?? null;
  }

  await updateDoc(userRef, update);
  const snap = await getDoc(userRef);
  const u = snap.data()!;

  return {
    id: userId,
    telegramId: u.telegramId,
    firstName: u.firstName,
    lastName: u.lastName,
    role: data.role,
    codexAccepted: true,
    trustScore: u.trustScore ?? 4.5,
    phone: u.phone,
    city: u.city || "",
    cityLat: u.cityLat || 0,
    cityLng: u.cityLng || 0,
    gender: u.gender || "",
    avatarUrl: u.avatarUrl,
    selfieAvatarAt: (u as any).selfieAvatarAt,
    driverProfile: u.driverProfile || null,
  };
}

export async function getMe(userId: string) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) throw new Error("Not found");
  const u = snap.data()!;
  return {
    id: userId,
    telegramId: u.telegramId,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    status: u.status,
    codexAccepted: u.codexAccepted,
    avatarUrl: u.avatarUrl,
    selfieAvatarAt: (u as any).selfieAvatarAt,
    trustScore: u.trustScore ?? 4.5,
    city: u.city || "",
    cityLat: u.cityLat || 0,
    cityLng: u.cityLng || 0,
    gender: u.gender || "",
    driverProfile: u.driverProfile || null,
  };
}

// ==================== PRICING & CATEGORIES ====================

export const TARIFFS = [
  { id: "narodniy", name: "Народный",  icon: "/icons/tariff-narodniy.png", multiplier: 0.82, desc: "Любое авто до 20 лет",       color: "#22c55e" },
  { id: "econom",   name: "Стандарт",  icon: "/icons/tariff-econom.png",   multiplier: 1.00, desc: "Авто до 15 лет", color: "#3b82f6" },
  { id: "comfort",  name: "Комфорт+",  icon: "/icons/tariff-comfort.png",  multiplier: 1.25, desc: "Комфортные авто",      color: "#a855f7" },
  { id: "business", name: "Бизнес",    icon: "/icons/tariff-business.png", multiplier: 1.65, desc: "Премиум авто",         color: "#1e293b" },
] as const;

export type TariffId = typeof TARIFFS[number]["id"];

const BASE_PRICING = { baseFare: 500, perKm: 120, perMin: 40, minFare: 800 };

export function calculateTripPrice(distanceKm: number, estimatedMinutes: number, tariffId: TariffId = "econom") {
  const { baseFare, perKm, perMin, minFare } = BASE_PRICING;
  const tariff = TARIFFS.find((t) => t.id === tariffId) || TARIFFS[1];
  const distanceFare = Math.round(distanceKm * perKm);
  const timeFare = Math.round(estimatedMinutes * perMin);
  const rawBase = baseFare + distanceFare + timeFare;
  const raw = Math.round(rawBase * tariff.multiplier);
  const price = Math.ceil(Math.max(raw, Math.round(minFare * tariff.multiplier)) / 50) * 50;
  return { distanceKm, estimatedMinutes, price, tariffId, tariffName: tariff.name, breakdown: { baseFare: Math.round(baseFare * tariff.multiplier), distanceFare: Math.round(distanceFare * tariff.multiplier), timeFare: Math.round(timeFare * tariff.multiplier) } };
}

export function getAllTariffPrices(distanceKm: number, estimatedMinutes: number) {
  return TARIFFS.map((t) => ({
    ...t,
    ...calculateTripPrice(distanceKm, estimatedMinutes, t.id),
  }));
}

// ==================== INTERCITY ====================

export async function createIntercityTrip(
  clientId: string,
  data: {
    departureCity: string;
    destinationCity: string;
    scheduledAt: string;
    seatsRequested: number;
    pricePerSeat: number;
    fullCar?: boolean;
    hasBaggage?: boolean;
    distanceKm: number;
    estimatedHours: number;
    femaleDriverOnly?: boolean;
    clientNote?: string;
  }
) {
  const ACTIVE_IC = ["SEARCHING", "BIDDING", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"];
  const activeQ = query(collection(db, "trips"), where("clientId", "==", clientId), where("status", "in", ACTIVE_IC), limit(3));
  const activeSnap = await getDocs(activeQ);
  const activeIntercity = activeSnap.docs.filter(d => d.data().tripType === 'INTERCITY');
  if (activeIntercity.length >= 3) throw new Error("Максимум 3 активных межгородских запроса");

  const totalPrice = data.fullCar
    ? data.pricePerSeat * 4
    : data.pricePerSeat * data.seatsRequested;

  const tripRef = await addDoc(collection(db, "trips"), {
    clientId,
    driverId: null,
    tripType: "INTERCITY",
    departureCity: data.departureCity,
    destinationCity: data.destinationCity,
    pickupAddress: data.departureCity,
    dropoffAddress: data.destinationCity,
    pickupLat: 0,
    pickupLng: 0,
    dropoffLat: 0,
    dropoffLng: 0,
    distanceKm: data.distanceKm,
    estimatedMinutes: Math.round(data.estimatedHours * 60),
    estimatedHours: data.estimatedHours,
    scheduledAt: data.scheduledAt,
    seatsRequested: data.seatsRequested,
    pricePerSeat: Math.round(data.pricePerSeat / 50) * 50,
    fullCar: data.fullCar || false,
    hasBaggage: data.hasBaggage || false,
    price: totalPrice,
    finalPrice: null,
    status: "SEARCHING",
    bidsCount: 0,
    city: data.departureCity,
    femaleDriverOnly: data.femaleDriverOnly || false,
    clientNote: data.clientNote || "",
    paymentMethod: "CASH",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(tripRef);
  return { id: tripRef.id, ...snap.data() };
}

export function onIntercityTrips(
  callback: (trips: any[]) => void,
  _city?: string
): () => void {
  const q = query(
    collection(db, "trips"),
    where("tripType", "==", "INTERCITY"),
    where("status", "in", ["SEARCHING", "BIDDING"]),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(trips);
  }, (err) => {
    console.error("[onIntercityTrips] Firestore error:", err);
    callback([]);
  });
}

// ==================== TRIPS ====================

const ACTIVE_STATUSES = ["SEARCHING", "BIDDING", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createTrip(
  clientId: string,
  data: {
    pickupLat: number; pickupLng: number; pickupAddress: string;
    dropoffLat: number; dropoffLng: number; dropoffAddress: string;
    distanceKm: number; estimatedMinutes: number;
    price?: number; tariff?: string;
    city?: string;
    femaleDriverOnly?: boolean;
    clientNote?: string;
  }
) {
  const activeQ = query(collection(db, "trips"), where("clientId", "==", clientId), where("status", "in", ACTIVE_STATUSES), limit(1));
  const activeSnap = await getDocs(activeQ);
  if (!activeSnap.empty) throw new Error("У вас уже есть активная поездка");

  const estimate = calculateTripPrice(data.distanceKm, data.estimatedMinutes);
  const finalPrice = typeof data.price === 'number' && data.price >= 0
    ? Math.round(data.price / 50) * 50
    : estimate.price;

  const tripRef = await addDoc(collection(db, "trips"), {
    clientId,
    driverId: null,
    tripType: "CITY",
    pickupLat: data.pickupLat,
    pickupLng: data.pickupLng,
    pickupAddress: data.pickupAddress,
    dropoffLat: data.dropoffLat,
    dropoffLng: data.dropoffLng,
    dropoffAddress: data.dropoffAddress,
    distanceKm: data.distanceKm,
    estimatedMinutes: data.estimatedMinutes,
    price: finalPrice,
    tariff: data.tariff || "econom",
    finalPrice: null,
    status: "SEARCHING",
    bidsCount: 0,
    city: data.city || "",
    femaleDriverOnly: data.femaleDriverOnly || false,
    clientNote: data.clientNote || "",
    paymentMethod: "CASH",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(tripRef);
  return { id: tripRef.id, ...snap.data(), priceEstimate: estimate };
}

export async function updateTripPrice(tripId: string, newPrice: number, clientId: string) {
  const tripRef = doc(db, "trips", tripId);
  const snap = await getDoc(tripRef);
  if (!snap.exists()) throw new Error("Поездка не найдена");
  const trip = snap.data();
  if (trip.clientId !== clientId) throw new Error("Нет доступа");
  if (!["SEARCHING", "BIDDING"].includes(trip.status)) throw new Error("Нельзя изменить цену");
  const rounded = Math.max(650, Math.round(newPrice / 100) * 100);
  await updateDoc(tripRef, { price: rounded, updatedAt: serverTimestamp() });
}

// ==================== AUCTION / BIDS ====================

export async function createBid(
  tripId: string,
  driverId: string,
  price: number,
  message?: string
) {
  const tripSnap = await getDoc(doc(db, "trips", tripId));
  if (!tripSnap.exists()) throw new Error("Поездка не найдена");
  const trip = tripSnap.data()!;
  if (!["SEARCHING", "BIDDING"].includes(trip.status)) throw new Error("Нельзя предложить цену");

  // Check if driver already bid
  const existingQ = query(
    collection(db, "trips", tripId, "bids"),
    where("driverId", "==", driverId),
    where("status", "==", "PENDING"),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) throw new Error("Вы уже предложили цену");

  const driverSnap = await getDoc(doc(db, "users", driverId));
  const d = driverSnap.data()!;
  const dp = d.driverProfile || {};

  // Calculate ETA based on distance
  let etaMinutes = 5;
  if (dp.currentLat && dp.currentLng) {
    const dist = haversine(trip.pickupLat, trip.pickupLng, dp.currentLat, dp.currentLng);
    etaMinutes = Math.max(1, Math.round(dist / 500)); // ~30km/h in city
  }

  const bidRef = await addDoc(collection(db, "trips", tripId, "bids"), {
    tripId,
    driverId,
    price: Math.round(price / 100) * 100,
    message: message || "",
    etaMinutes,
    status: "PENDING",
    createdAt: serverTimestamp(),
    driver: {
      id: driverId,
      firstName: d.firstName,
      lastName: d.lastName,
      avatarUrl: d.avatarUrl || null,
      trustScore: { score: d.trustScore ?? 4.5 },
      driverProfile: {
        carBrand: dp.carBrand || "",
        carModel: dp.carModel || "",
        carColor: dp.carColor || "",
        carYear: dp.carYear || null,
        licensePlate: dp.licensePlate || "",
        vehiclePhotoUrls: dp.vehiclePhotoUrls && typeof dp.vehiclePhotoUrls === "object" ? dp.vehiclePhotoUrls : undefined,
      },
    },
  });

  // Update trip status to BIDDING and increment bids count
  await updateDoc(doc(db, "trips", tripId), {
    status: "BIDDING",
    bidsCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { id: bidRef.id };
}

export async function acceptBid(tripId: string, bidId: string, clientId: string) {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error("Поездка не найдена");
  const trip = tripSnap.data()!;
  if (trip.clientId !== clientId) throw new Error("Не ваша поездка");

  const bidRef = doc(db, "trips", tripId, "bids", bidId);
  const bidSnap = await getDoc(bidRef);
  if (!bidSnap.exists()) throw new Error("Предложение не найдено");
  const bid = bidSnap.data()!;

  // Accept this bid
  await updateDoc(bidRef, { status: "ACCEPTED" });

  // Reject all other bids
  const otherBidsQ = query(
    collection(db, "trips", tripId, "bids"),
    where("status", "==", "PENDING")
  );
  const otherSnap = await getDocs(otherBidsQ);
  for (const d of otherSnap.docs) {
    if (d.id !== bidId) await updateDoc(d.ref, { status: "REJECTED" });
  }

  // Fetch driver name for notifications
  let driverName = "";
  try {
    const driverSnap = await getDoc(doc(db, "users", bid.driverId));
    if (driverSnap.exists()) {
      const d = driverSnap.data();
      driverName = [d.firstName, d.lastName].filter(Boolean).join(" ");
    }
  } catch {}

  await updateDoc(tripRef, {
    driverId: bid.driverId,
    driverName,
    finalPrice: bid.price,
    status: "DRIVER_ASSIGNED",
    driverAssignedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", bid.driverId), { "driverProfile.driverStatus": "BUSY" });

  const updated = await getDoc(tripRef);
  return enrichTripWithUsers({ id: tripId, ...updated.data() });
}

/** Клиент отказывается от выбранного водителя до выезда — снова аукцион, остальные отклики возвращаются в ожидание */
export async function declineAssignedDriver(tripId: string, clientId: string) {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error("Поездка не найдена");
  const trip = tripSnap.data()!;
  if (trip.clientId !== clientId) throw new Error("Не ваша поездка");
  if (trip.status !== "DRIVER_ASSIGNED") {
    throw new Error("Сменить водителя можно только до выезда к вам");
  }
  const assignedDriverId = trip.driverId as string | undefined;
  if (!assignedDriverId) throw new Error("Водитель не назначен");

  const bidsColl = collection(db, "trips", tripId, "bids");
  const bidsSnap = await getDocs(bidsColl);
  const acceptedDoc = bidsSnap.docs.find((d) => d.data().status === "ACCEPTED");
  if (!acceptedDoc) throw new Error("Не найдено подтверждённое предложение");

  const declinedDriverId = String(acceptedDoc.data().driverId || "");
  const batch = writeBatch(db);
  batch.update(acceptedDoc.ref, { status: "REJECTED" });

  bidsSnap.docs.forEach((d) => {
    if (d.id === acceptedDoc.id) return;
    const b = d.data();
    const dr = b.driverId as string | undefined;
    if (b.status === "REJECTED" && dr && dr !== declinedDriverId) {
      batch.update(d.ref, { status: "PENDING" });
    }
  });

  batch.update(tripRef, {
    driverId: null,
    driverName: "",
    finalPrice: null,
    driverAssignedAt: null,
    status: "BIDDING",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  await updateDoc(doc(db, "users", declinedDriverId), { "driverProfile.driverStatus": "ONLINE" });

  const updated = await getDoc(tripRef);
  return enrichTripWithUsers({ id: tripId, ...updated.data() });
}

export function onTripBids(tripId: string, callback: (bids: any[]) => void): () => void {
  const q = query(
    collection(db, "trips", tripId, "bids"),
    where("status", "==", "PENDING"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Listen for SEARCHING/BIDDING trips.
 * Always queries all trips (no city filter) to avoid mismatches.
 */
export function onNearbyTrips(
  driverId: string,
  callback: (trips: any[]) => void,
  _city?: string
): () => void {
  const q = query(
    collection(db, "trips"),
    where("status", "in", ["SEARCHING", "BIDDING"]),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t: any) => t.tripType !== 'INTERCITY');
    callback(trips);
  }, (err) => {
    console.error("[onNearbyTrips] Firestore error:", err);
    callback([]);
  });
}

/** Подмешивает client/driver из users (для экрана поездки и снапшотов без вложенных полей) */
export async function enrichTripWithUsers(trip: any): Promise<any> {
  if (!trip?.clientId) return trip;
  const [clientSnap, driverSnap] = await Promise.all([
    getDoc(doc(db, "users", trip.clientId)),
    trip.driverId ? getDoc(doc(db, "users", trip.driverId)) : Promise.resolve(null),
  ]);
  const client = clientSnap.exists() ? clientSnap.data() : null;
  const driver = driverSnap?.exists() ? driverSnap.data() : null;
  return {
    ...trip,
    client: client
      ? {
          id: trip.clientId,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          avatarUrl: client.avatarUrl,
          trustScore: { score: client.trustScore ?? 4.5 },
        }
      : null,
    driver: driver
      ? {
          id: trip.driverId,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
          avatarUrl: driver.avatarUrl,
          trustScore: { score: driver.trustScore ?? 4.5 },
          driverProfile: driver.driverProfile || null,
        }
      : null,
  };
}

export async function getTripByIdEnriched(tripId: string) {
  const tripSnap = await getDoc(doc(db, "trips", tripId));
  if (!tripSnap.exists()) return null;
  return enrichTripWithUsers({ id: tripSnap.id, ...tripSnap.data() });
}

export async function getActiveTrip(userId: string) {
  // As client
  let q = query(collection(db, "trips"), where("clientId", "==", userId), where("status", "in", ACTIVE_STATUSES), limit(1));
  let snap = await getDocs(q);

  // As driver
  if (snap.empty) {
    q = query(collection(db, "trips"), where("driverId", "==", userId), where("status", "in", ACTIVE_STATUSES), limit(1));
    snap = await getDocs(q);
  }

  if (snap.empty) return null;

  const tripDoc = snap.docs[0];
  return enrichTripWithUsers({ id: tripDoc.id, ...tripDoc.data() });
}

export async function getTripHistory(userId: string, role?: string) {
  const field = role === "DRIVER" ? "driverId" : "clientId";
  const q = query(collection(db, "trips"), where(field, "==", userId), orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const TRANSITIONS: Record<string, string[]> = {
  SEARCHING: ["BIDDING", "DRIVER_ASSIGNED", "CANCELLED", "NO_DRIVER"],
  BIDDING: ["DRIVER_ASSIGNED", "CANCELLED", "NO_DRIVER"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "CANCELLED"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateTripStatus(tripId: string, newStatus: string, userId: string, cancelReason?: string) {
  const tripRef = doc(db, "trips", tripId);
  const snap = await getDoc(tripRef);
  if (!snap.exists()) throw new Error("Поездка не найдена");

  const trip = snap.data()!;
  const allowed = TRANSITIONS[trip.status] || [];
  if (!allowed.includes(newStatus)) throw new Error(`Нельзя: ${trip.status} → ${newStatus}`);

  const update: any = { status: newStatus, updatedAt: serverTimestamp() };

  if (newStatus === "DRIVER_ARRIVED") update.driverArrivedAt = serverTimestamp();
  if (newStatus === "PAID") update.paidAt = serverTimestamp();
  if (newStatus === "IN_PROGRESS") update.startedAt = serverTimestamp();
  if (newStatus === "COMPLETED") {
    update.completedAt = serverTimestamp();
    if (trip.driverId) await updateDoc(doc(db, "users", trip.driverId), { "driverProfile.driverStatus": "ONLINE" });
  }
  if (newStatus === "CANCELLED") {
    update.cancelledAt = serverTimestamp();
    update.cancelledBy = userId;
    update.cancelReason = cancelReason || "";
    if (trip.driverId) await updateDoc(doc(db, "users", trip.driverId), { "driverProfile.driverStatus": "ONLINE" });
    // trustScore penalty disabled for now
  }

  await updateDoc(tripRef, update);
  const updated = await getDoc(tripRef);
  return enrichTripWithUsers({ id: tripId, ...updated.data() });
}

export async function rateTrip(tripId: string, raterId: string, score: number, comment?: string) {
  const numScore = typeof score === "number" && score >= 1 && score <= 5 ? score : 5;
  const snap = await getDoc(doc(db, "trips", tripId));
  if (!snap.exists()) throw new Error("Не найдена");
  const trip = snap.data()!;
  const ratedId = trip.clientId === raterId ? trip.driverId : trip.clientId;
  if (!ratedId) throw new Error("Нет участника");

  await addDoc(collection(db, "ratings"), {
    tripId, raterId, ratedId, score: numScore, comment: comment || "", createdAt: serverTimestamp(),
  });

  let delta = 0;
  if (numScore === 5) delta = 0.01;
  else if (numScore === 4) delta = 0.005;

  await updateDoc(doc(db, "users", ratedId), {
    totalRatings: increment(1),
    ...(delta > 0 ? { trustScore: increment(delta) } : {}),
  });
}

// ==================== DRIVER ====================

export async function driverGoOnline(driverId: string) {
  const snap = await getDoc(doc(db, "users", driverId));
  const data = snap.data();
  const dp = data?.driverProfile;
  if (!dp) throw new Error("Нет профиля водителя");
  if (!dp.isVerified) throw new Error("Пройдите верификацию, чтобы выйти на линию");
  const avatar = typeof data?.avatarUrl === "string" ? data.avatarUrl.trim() : "";
  if (!avatar) {
    throw new Error("Сделайте селфи в «Профиль» — без фото нельзя выйти на линию");
  }
  const selfieAt = (data as any)?.selfieAvatarAt;
  if (selfieAt == null) {
    throw new Error("Нужно селфи через камеру в «Профиль» — аватар из Telegram не подходит для линии");
  }
  await updateDoc(doc(db, "users", driverId), { "driverProfile.driverStatus": "ONLINE" });
}

export async function driverGoOffline(driverId: string) {
  await updateDoc(doc(db, "users", driverId), { "driverProfile.driverStatus": "OFFLINE" });
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number, heading?: number, speed?: number) {
  await updateDoc(doc(db, "users", driverId), {
    "driverProfile.currentLat": lat,
    "driverProfile.currentLng": lng,
    "driverProfile.lastLocationAt": serverTimestamp(),
  });
  await setDoc(doc(db, "driverLocations", driverId), {
    lat, lng, heading: heading || 0, speed: speed || 0, updatedAt: serverTimestamp(),
  });
}

export async function driverSubscribe(driverId: string) {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, "users", driverId), {
    "driverProfile.subscriptionActive": true,
    "driverProfile.subscriptionExpiresAt": Timestamp.fromDate(expires),
  });
  await addDoc(collection(db, "subscriptions"), {
    driverId, amount: 200, paidAt: serverTimestamp(), expiresAt: Timestamp.fromDate(expires),
  });
  return { subscriptionActive: true, expiresAt: expires.toISOString() };
}

export async function getDriverStats(driverId: string) {
  const snap = await getDoc(doc(db, "users", driverId));
  const u = snap.data()!;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayQ = query(collection(db, "trips"), where("driverId", "==", driverId), where("status", "==", "COMPLETED"), limit(50));
  const todaySnap = await getDocs(todayQ);
  let todayEarnings = 0;
  let todayCount = 0;
  todaySnap.docs.forEach((d) => {
    const t = d.data();
    if (t.completedAt?.toDate?.() >= today) {
      todayEarnings += t.price || 0;
      todayCount++;
    }
  });
  return { totalTrips: u.totalTrips || 0, todayTrips: todayCount, todayEarnings, trustScore: u.trustScore ?? 4.5 };
}

// ==================== CHAT ====================

export const CHAT_TEMPLATES = {
  CLIENT: [
    { id: "coming_out", text: "Выхожу" },
    { id: "wait_2min", text: "Подождите 2 минуты" },
    { id: "im_here", text: "Я на месте" },
    { id: "where_are_you", text: "Где вы?" },
  ],
  DRIVER: [
    { id: "arriving", text: "Подъезжаю" },
    { id: "im_here", text: "Я на месте" },
    { id: "waiting", text: "Ожидаю вас" },
    { id: "which_entrance", text: "Какой подъезд?" },
    { id: "traffic", text: "Стою в пробке, задержусь" },
  ],
};

export async function sendChatMessage(
  tripId: string,
  senderId: string,
  data: { type: string; content: string; lat?: number; lng?: number }
) {
  const userSnap = await getDoc(doc(db, "users", senderId));
  const u = userSnap.data()!;

  const msgRef = await addDoc(collection(db, "trips", tripId, "messages"), {
    senderId,
    type: data.type,
    content: data.content,
    lat: data.lat || null,
    lng: data.lng || null,
    isRead: false,
    createdAt: serverTimestamp(),
    sender: { id: senderId, firstName: u.firstName, role: u.role },
  });

  return { id: msgRef.id };
}

// ==================== REAL-TIME LISTENERS ====================

export function onTripUpdate(tripId: string, callback: (trip: any) => void): () => void {
  return onSnapshot(doc(db, "trips", tripId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

export function onDriverLocation(
  driverId: string,
  callback: (loc: { lat: number; lng: number; heading?: number }) => void
): () => void {
  return onSnapshot(doc(db, "driverLocations", driverId), (snap) => {
    if (snap.exists()) {
      const d = snap.data();
      callback({ lat: d.lat, lng: d.lng, heading: d.heading });
    }
  });
}

export function onChatMessages(tripId: string, callback: (messages: any[]) => void): () => void {
  const q = query(collection(db, "trips", tripId, "messages"), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Слушатель входящих заказов для водителя.
 * Отслеживает поездки, назначенные на этого водителя и находящиеся в активном статусе.
 * Когда появляется новый заказ (DRIVER_ASSIGNED) — вызывается callback.
 */
export function onDriverIncomingTrips(
  driverId: string,
  callback: (trip: any) => void
): () => void {
  const q = query(
    collection(db, "trips"),
    where("driverId", "==", driverId),
    where("status", "in", ACTIVE_STATUSES),
    limit(1)
  );
  return onSnapshot(q, async (snap) => {
    if (!snap.empty) {
      const tripDoc = snap.docs[0];
      const trip = tripDoc.data();

      // Подгружаем клиента
      let client = null;
      try {
        const clientSnap = await getDoc(doc(db, "users", trip.clientId));
        if (clientSnap.exists()) {
          const c = clientSnap.data();
          client = { id: trip.clientId, firstName: c.firstName, lastName: c.lastName, phone: c.phone, trustScore: { score: c.trustScore ?? 4.5 } };
        }
      } catch {}

      callback({
        id: tripDoc.id,
        ...trip,
        client,
      });
    }
  });
}

// ==================== VERIFICATION (Driver + Admin) ====================

export const VERIFICATION_DOC_TYPES = ["techPassport", "license"] as const;
export const VERIFICATION_PHOTO_KEYS = ["front", "rear", "left", "right", "interiorFront", "interiorRear", "trunk"] as const;

export async function uploadVerificationFile(
  userId: string,
  type: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `verification/${userId}/${type}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      () => {},
      reject,
      () => resolve()
    );
  });
  return getDownloadURL(storageRef);
}

export interface VerificationFileData {
  url: string;
  extractedText?: string;
  entities?: Array<{ type: string; mentionText: string; confidence: number }>;
}

export interface VerificationDocuments {
  techPassport?: VerificationFileData;
  license?: VerificationFileData;
}

export interface VerificationVehiclePhotos {
  front?: VerificationFileData;
  rear?: VerificationFileData;
  left?: VerificationFileData;
  right?: VerificationFileData;
  interiorFront?: VerificationFileData;
  interiorRear?: VerificationFileData;
  trunk?: VerificationFileData;
}

export async function createVerificationRequest(
  driverId: string,
  driverName: string,
  data: {
    documents: VerificationDocuments;
    vehiclePhotos: VerificationVehiclePhotos;
    verdict?: {
      approved: boolean;
      maxTariff: string;
      availableTariffs: string[];
      checklist: Array<{ label: string; passed: boolean; detail: string }>;
      carYear: number | null;
      carBrand: string;
      carModel: string;
    };
  }
) {
  const existing = await getVerificationByDriver(driverId);
  if (existing && (existing.status === "approved"))
    throw new Error("Вы уже верифицированы");

  const autoApproved = data.verdict?.approved ?? false;
  const maxTariff = data.verdict?.maxTariff || "narodniy";

  const reqRef = await addDoc(collection(db, "verification_requests"), {
    driverId,
    driverName,
    documents: data.documents,
    vehiclePhotos: data.vehiclePhotos,
    verdict: data.verdict || null,
    status: autoApproved ? "approved" : "rejected",
    aiMaxTariff: maxTariff,
    aiAvailableTariffs: data.verdict?.availableTariffs || ["narodniy"],
    submittedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedBy: "AI_AUTO",
    rejectionReason: autoApproved ? null : "ИИ не смог подтвердить документы. Проверьте качество фото и переотправьте.",
  });

  if (autoApproved) {
    const vehiclePhotoUrls: Record<string, string> = {};
    for (const k of VERIFICATION_PHOTO_KEYS) {
      const u = (data.vehiclePhotos as any)[k]?.url;
      if (typeof u === "string" && u.length > 0) vehiclePhotoUrls[k] = u;
    }
    const brandRaw = data.verdict?.carBrand?.trim() || "";
    const modelRaw = data.verdict?.carModel?.trim() || "";
    const userUpdate: Record<string, string | number | boolean | Record<string, string> | ReturnType<typeof serverTimestamp> | null> = {
      "driverProfile.isVerified": true,
      "driverProfile.maxTariff": maxTariff,
      "driverProfile.carYear": data.verdict?.carYear ?? null,
      "driverProfile.vehiclePhotoUrls": vehiclePhotoUrls,
      updatedAt: serverTimestamp(),
    };
    if (brandRaw) userUpdate["driverProfile.carBrand"] = prettifyVehicleField(brandRaw);
    if (modelRaw) userUpdate["driverProfile.carModel"] = prettifyVehicleField(modelRaw);
    await updateDoc(doc(db, "users", driverId), userUpdate as any);
  }

  return { id: reqRef.id, autoApproved, maxTariff };
}

export async function getVerificationByDriver(driverId: string) {
  const q = query(
    collection(db, "verification_requests"),
    where("driverId", "==", driverId),
    orderBy("submittedAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as any;
}

export async function listVerificationRequestsForAdmin(status?: "pending_moderation" | "approved" | "rejected") {
  let q = query(
    collection(db, "verification_requests"),
    orderBy("submittedAt", "desc"),
    limit(100)
  );
  if (status) q = query(collection(db, "verification_requests"), where("status", "==", status), orderBy("submittedAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
}

export async function approveVerificationRequest(
  requestId: string,
  adminId: string,
  confirmedTariff?: string
) {
  const reqRef = doc(db, "verification_requests", requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Заявка не найдена");
  const data = snap.data()!;
  if (data.status === "approved") throw new Error("Заявка уже одобрена");

  const tariff = confirmedTariff || data.aiMaxTariff || "narodniy";

  await updateDoc(reqRef, {
    status: "approved",
    moderatorTariff: tariff,
    reviewedAt: serverTimestamp(),
    reviewedBy: adminId,
    rejectionReason: null,
  });
  const brandRaw = data.verdict?.carBrand?.trim() || "";
  const modelRaw = data.verdict?.carModel?.trim() || "";
  const userUpdate: Record<string, string | number | boolean | ReturnType<typeof serverTimestamp> | null> = {
    "driverProfile.isVerified": true,
    "driverProfile.maxTariff": tariff,
    "driverProfile.carYear": data.verdict?.carYear ?? null,
    updatedAt: serverTimestamp(),
  };
  if (brandRaw) userUpdate["driverProfile.carBrand"] = prettifyVehicleField(brandRaw);
  if (modelRaw) userUpdate["driverProfile.carModel"] = prettifyVehicleField(modelRaw);
  await updateDoc(doc(db, "users", data.driverId), userUpdate as any);
}

export async function rejectVerificationRequest(requestId: string, adminId: string, reason: string) {
  const reqRef = doc(db, "verification_requests", requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Заявка не найдена");

  await updateDoc(reqRef, {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminId,
    rejectionReason: reason || "Не указана",
  });
}

export async function getAdminUids(): Promise<string[]> {
  const snap = await getDoc(doc(db, "config", "admins"));
  if (!snap.exists()) return [];
  const data = snap.data()!;
  return Array.isArray(data?.uids) ? data.uids : [];
}
