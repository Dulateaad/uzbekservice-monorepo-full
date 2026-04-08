import crypto from "crypto";
import { config } from "../config";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export function validateTelegramWebAppData(initData: string): { valid: boolean; user?: TelegramUser } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };
    params.delete("hash");
    const arr: string[] = [];
    params.sort();
    params.forEach((v, k) => arr.push(`${k}=${v}`));
    const secret = crypto.createHmac("sha256", "WebAppData").update(config.telegramBotToken).digest();
    const calc = crypto.createHmac("sha256", secret).update(arr.join("\n")).digest("hex");
    if (calc !== hash) return { valid: false };
    const userStr = params.get("user");
    if (!userStr) return { valid: false };
    return { valid: true, user: JSON.parse(userStr) };
  } catch {
    return { valid: false };
  }
}
