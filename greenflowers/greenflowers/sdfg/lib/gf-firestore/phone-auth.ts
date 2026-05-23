/**
 * Вход по SMS через Firebase Phone Auth (без sprayApi / Cloud Function).
 * В консоли Firebase: Authentication → Sign-in method → Phone.
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

let confirmationResult: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

/** Удаляет разметку reCAPTCHA из контейнера (иначе «already been rendered in this element»). */
function wipeRecaptchaContainerDom() {
  if (typeof document === "undefined") return;
  for (const id of ["gf-recaptcha-container", "gf-recaptcha-auth-inline"]) {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  }
}

/** E.164 для KZ/RU: +7 и 10 цифр после */
export function normalizePhoneE164(input: string): string {
  const d = input.replace(/\D/g, "");
  if (d.length === 0) return "";
  if (d.length === 11 && d.startsWith("8")) return "+7" + d.slice(1);
  if (d.length === 10) return "+7" + d;
  if (d.length === 11 && d.startsWith("7")) return "+" + d;
  return "+" + d;
}

export function clearPhoneAuthSession() {
  confirmationResult = null;
  try {
    verifier?.clear();
  } catch {
    /* ignore */
  }
  verifier = null;
  wipeRecaptchaContainerDom();
}

export type PhoneRecaptchaOptions = {
  containerId?: string;
  size?: "invisible" | "normal" | "compact";
};

export async function sendPhoneVerificationCode(
  auth: Auth,
  rawPhone: string,
  options?: PhoneRecaptchaOptions,
): Promise<void> {
  const phoneE164 = normalizePhoneE164(rawPhone);
  if (phoneE164.length < 12) {
    throw new Error("Неверный формат номера (нужен мобильный, например +7 777 …)");
  }

  if (typeof document === "undefined") {
    throw new Error("SMS доступен только в браузере");
  }

  clearPhoneAuthSession();
  wipeRecaptchaContainerDom();

  const containerId = options?.containerId ?? "gf-recaptcha-container";
  const size = options?.size ?? "invisible";
  if (!document.getElementById(containerId)) {
    throw new Error(
      `Не найден контейнер reCAPTCHA (#${containerId}). Обновите страницу.`,
    );
  }

  verifier = new RecaptchaVerifier(auth, containerId, {
    size,
    callback: () => {},
  });

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneE164, verifier);
  } catch (e) {
    clearPhoneAuthSession();
    throw e;
  }
}

export async function confirmPhoneVerificationCode(code: string) {
  if (!confirmationResult) {
    throw new Error("Сначала нажмите «Отправить код»");
  }
  const trimmed = String(code ?? "").trim();
  if (!trimmed) {
    throw new Error("Введите код из SMS");
  }
  const cred = await confirmationResult.confirm(trimmed);
  confirmationResult = null;
  try {
    verifier?.clear();
  } catch {
    /* ignore */
  }
  verifier = null;
  wipeRecaptchaContainerDom();
  return cred;
}
