import { getFirebaseAuth } from "@/lib/firebase";

/** Раньше дергался sprayApi; без HTTP API синхронизация только через Firestore в клиенте. */
export async function syncFirebaseProfileToBackend(_body?: {
  name?: string;
  city?: string;
  phone?: string;
}) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    return { success: false, error: "Нет сессии Firebase" };
  }
  return { success: true, message: "Профиль хранится в Firestore (profiles)" };
}
