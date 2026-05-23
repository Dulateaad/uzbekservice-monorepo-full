/**
 * Настройки баннера «Предзаказ» на главной (site_settings/preorder_banner).
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

export type PreorderBannerSettings = {
  visible: boolean;
  /** Текст после «Успейте до » (например «21 февраля»). */
  deadline_text: string;
  /** Число для бейджа скидки (5 → «-5%»). */
  discount_percent: number;
  /** Только цифры для wa.me, без + (например 77082354533). */
  whatsapp_digits: string;
};

export const DEFAULT_PREORDER_BANNER: PreorderBannerSettings = {
  visible: true,
  deadline_text: "21 февраля",
  discount_percent: 5,
  whatsapp_digits: "77082354533",
};

const COLLECTION = "site_settings";
const DOC_ID = "preorder_banner";

function onlyDigits(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function clampDiscount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 99) return 99;
  return Math.round(n);
}

function mergeWithDefaults(
  raw: Record<string, unknown> | undefined,
): PreorderBannerSettings {
  if (!raw) return { ...DEFAULT_PREORDER_BANNER };
  const digits = onlyDigits(String(raw.whatsapp_digits ?? raw.whatsapp ?? ""));
  return {
    visible: raw.visible === false ? false : true,
    deadline_text:
      String(raw.deadline_text ?? DEFAULT_PREORDER_BANNER.deadline_text).trim() ||
      DEFAULT_PREORDER_BANNER.deadline_text,
    discount_percent: clampDiscount(
      Number(raw.discount_percent ?? DEFAULT_PREORDER_BANNER.discount_percent),
    ),
    whatsapp_digits:
      digits.length >= 10
        ? digits
        : DEFAULT_PREORDER_BANNER.whatsapp_digits,
  };
}

export async function getPreorderBannerSettingsFirestore(db: Firestore) {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  const data = snap.exists()
    ? mergeWithDefaults(snap.data() as Record<string, unknown>)
    : { ...DEFAULT_PREORDER_BANNER };
  return { success: true as const, data };
}

export async function setPreorderBannerSettingsFirestore(
  db: Firestore,
  patch: Partial<PreorderBannerSettings>,
) {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  const cur = snap.exists()
    ? mergeWithDefaults(snap.data() as Record<string, unknown>)
    : { ...DEFAULT_PREORDER_BANNER };

  const next: PreorderBannerSettings = {
    visible:
      patch.visible !== undefined ? Boolean(patch.visible) : cur.visible,
    deadline_text:
      patch.deadline_text !== undefined
        ? String(patch.deadline_text).trim() || cur.deadline_text
        : cur.deadline_text,
    discount_percent:
      patch.discount_percent !== undefined
        ? clampDiscount(Number(patch.discount_percent))
        : cur.discount_percent,
    whatsapp_digits:
      patch.whatsapp_digits !== undefined
        ? (() => {
            const d = onlyDigits(patch.whatsapp_digits);
            return d.length >= 10 ? d : cur.whatsapp_digits;
          })()
        : cur.whatsapp_digits,
  };

  await setDoc(
    ref,
    {
      ...next,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return { success: true as const, data: next };
}
